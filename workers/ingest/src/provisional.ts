import type { z } from "zod";
import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { raceStart, type RaceSummary } from "@paddock/shared";
import type { driverSchema, sessionResultSchema } from "@paddock/shared/openf1";
import type { Env } from "./env";
import { createOpenF1, openf1Context } from "./openf1";

/**
 * Resultado provisional de la carrera (D-31). OpenF1 publica la clasificación de la sesión minutos después
 * de la bandera a cuadros; Jolpica, horas después (y a veces se cae justo entonces). Mientras no hay
 * resultado oficial, se guarda el de OpenF1 en `provisional_results`, que la API sirve marcado como
 * provisional y que no cuenta para clasificaciones ni récords. En cuanto está el oficial, se borra.
 */

type SessionResult = z.infer<typeof sessionResultSchema>;
type OpenF1Driver = z.infer<typeof driverSchema>;
export interface LineupEntry {
  driverId: string;
  code: string;
  constructorId: string;
}
export interface ProvisionalRow {
  driverId: string;
  constructorId: string;
  position: number | null;
  positionText: string;
  laps: number;
  status: string;
  timeText: string | null;
  points: number;
}

const HOUR = 3_600_000;
/** Debutantes que se pueden omitir sin descartar el resultado entero. */
const MAX_UNMATCHED = 2;

/** 5723.504 s → «1:35:23.504», como el tiempo del ganador en Jolpica. */
function raceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${h}:${String(m).padStart(2, "0")}:${s}`;
}

/** 0.799 → «+0.799»; 62.345 → «+1:02.345», como las diferencias de Jolpica. */
function gapText(seconds: number): string {
  if (seconds < 60) return `+${seconds.toFixed(3)}`;
  const m = Math.floor(seconds / 60);
  return `+${m}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
}

/**
 * Convierte la clasificación de OpenF1 en filas nuestras. Cada piloto se casa por su código de tres letras
 * con la parrilla de la temporada. Un debutante aún no está en ella (no tiene identificador de Jolpica y no
 * se inventa): hasta dos se omiten, salvo que estén en el podio. Devuelve null, y no se escribe nada, si algo
 * más no cuadra: posiciones repetidas, sin ganador o un número de coches imposible. Mejor nada que un
 * resultado mal.
 */
export function toProvisional(results: SessionResult[], drivers: OpenF1Driver[], lineup: LineupEntry[]): ProvisionalRow[] | null {
  if (results.length < 10 || results.length > 30) return null;
  const codeByNumber = new Map(drivers.map((d) => [d.driver_number, d.name_acronym?.toUpperCase() ?? null]));
  const byCode = new Map(lineup.map((e) => [e.code.toUpperCase(), e]));
  const positions = results.map((r) => r.position).filter((p): p is number => typeof p === "number");
  if (new Set(positions).size !== positions.length || !positions.includes(1)) return null;
  const leaderLaps = results.find((r) => r.position === 1)?.number_of_laps ?? 0;

  const rows: ProvisionalRow[] = [];
  let unmatched = 0;
  for (const r of results) {
    const code = codeByNumber.get(r.driver_number);
    const entry = code ? byCode.get(code) : undefined;
    if (!entry) {
      unmatched += 1;
      if (unmatched > MAX_UNMATCHED || (r.position !== null && r.position !== undefined && r.position <= 3)) return null;
      continue;
    }
    const laps = r.number_of_laps ?? 0;
    const position = r.position ?? null;
    const behind = leaderLaps - laps;
    const status = r.dsq
      ? "Disqualified"
      : r.dns
        ? "Did not start"
        : r.dnf
          ? "Retired"
          : behind > 0
            ? `+${behind} ${behind === 1 ? "Lap" : "Laps"}`
            : "Finished";
    const positionText = position !== null ? String(position) : r.dsq ? "D" : r.dns ? "W" : r.dnf ? "R" : "N";
    let timeText: string | null = null;
    if (position === 1 && typeof r.duration === "number") timeText = raceTime(r.duration);
    else if (position !== null && typeof r.gap_to_leader === "number" && behind === 0) timeText = gapText(r.gap_to_leader);
    rows.push({ driverId: entry.driverId, constructorId: entry.constructorId, position, positionText, laps, status, timeText, points: r.points ?? 0 });
  }
  return rows;
}

/** La sesión de carrera de OpenF1 que corresponde a una ronda: la que empieza a menos de 6 h de nuestra hora. */
export function matchSession<T extends { date_start: string }>(sessions: T[], race: RaceSummary): T | null {
  const start = raceStart(race);
  let best: T | null = null;
  for (const s of sessions) {
    const diff = Math.abs(Date.parse(s.date_start) - start);
    if (diff < 6 * HOUR && (!best || diff < Math.abs(Date.parse(best.date_start) - start))) best = s;
  }
  return best;
}

/** Escribe (o borra, si ya está el oficial) el resultado provisional de una carrera terminada. */
export async function ingestProvisional(env: Env, race: RaceSummary, now: number): Promise<number> {
  const reader = createF1Reader(env.DB);
  const writer = createF1Writer(env.DB);
  if (await reader.hasRaceResult(race.season, race.round)) {
    await writer.replaceProvisional(race.season, race.round, []);
    return 0;
  }
  const openf1 = createOpenF1({ ...openf1Context(env), maxWaitMs: 20_000 });
  const session = matchSession(await openf1.raceSessions(race.season), race);
  if (!session) return 0;
  // Todavía en pista: la clasificación de OpenF1 aún no es la final.
  if (!session.date_end || Date.parse(session.date_end) > now) return 0;
  const [results, drivers, lineup] = await Promise.all([
    openf1.sessionResult(session.session_key),
    openf1.drivers(session.session_key),
    reader.seasonLineup(race.season),
  ]);
  const rows = toProvisional(results, drivers, lineup);
  if (!rows) {
    console.warn(JSON.stringify({ event: "provisional_skipped", season: race.season, round: race.round }));
    return 0;
  }
  const fetchedAt = new Date(now).toISOString();
  return writer.replaceProvisional(race.season, race.round, rows.map((r) => ({ ...r, fetchedAt })));
}
