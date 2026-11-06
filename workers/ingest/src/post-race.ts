import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import {
  ANALYSIS_VERSION,
  analysisKey,
  driverInfos,
  neutralisedPeriods,
  pace,
  replay,
  sectors,
  strategy,
  telemetry,
  weatherSummary,
  type AnalysisIndex,
  type DriverInfo,
  type ToolName,
} from "@paddock/analysis";
import { isSessionLive } from "@paddock/shared";
import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import type { Env } from "./env";
import { notifyAnalysis } from "./mailing";
import { createOpenF1, openf1Context } from "./openf1";

/**
 * Análisis tras cada carrera (D-08): datos de OpenF1, cálculo en TypeScript y JSON en R2.
 * Un paso para los datos de sesión y uno por piloto para la telemetría, todos idempotentes.
 */
/**
 * 30 reintentos cada 5 minutos: dos horas y media de margen, lo que dura una sesión en directo con
 * banderas rojas, durante la que OpenF1 no responde sin clave (D-25).
 */
const STEP = { retries: { limit: 30, delay: "5 minutes", backoff: "constant" }, timeout: "10 minutes" } as const;

/** Primera temporada con datos en OpenF1. */
export const OPENF1_FROM = 2023;

export interface PostRaceParams {
  season: number;
  round: number;
}

async function putJson(bucket: R2Bucket, key: string, value: unknown) {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json", cacheControl: "public, max-age=31536000, immutable" },
  });
}

interface TelemetryTarget {
  driver: DriverInfo;
  number: number;
  lap: number;
  from: string;
  to: string;
  lapTime: number;
}

export class PostRaceWorkflow extends WorkflowEntrypoint<Env, PostRaceParams> {
  override async run(event: WorkflowEvent<PostRaceParams>, step: WorkflowStep) {
    const { season, round } = event.payload;
    const client = () => createOpenF1(openf1Context(this.env));

    const sessionKey = await step.do("session", STEP, async () => {
      const race = await createF1Reader(this.env.DB).getRace(season, round);
      if (!race?.startsAt) throw new NonRetryableError(`sin hora de salida para ${season}/${round}`);
      const target = Date.parse(race.startsAt);
      const sessions = await client().raceSessions(season);
      const match = sessions
        .map((s) => ({ s, diff: Math.abs(Date.parse(s.date_start) - target) }))
        .sort((a, b) => a.diff - b.diff)[0];
      if (!match || match.diff > 6 * 3_600_000) throw new Error(`OpenF1 aún no tiene la carrera ${season}/${round}`);
      return match.s.session_key;
    });

    const weather = await step.do("weather", STEP, async () => weatherSummary(await client().weather(sessionKey)));

    const targets: TelemetryTarget[] = await step.do("session-data", STEP, async () => {
      const api = client();
      const [drivers, stints, pits, laps, rc, positions] = await Promise.all([
        api.drivers(sessionKey),
        api.stints(sessionKey),
        api.pit(sessionKey),
        api.laps(sessionKey),
        api.raceControl(sessionKey),
        api.position(sessionKey),
      ]);
      if (laps.length === 0) throw new Error("OpenF1 aún no tiene las vueltas");
      const totalLaps = Math.max(...laps.map((l) => l.lap_number));
      const infos = driverInfos(drivers, positions);
      const neutralised = neutralisedPeriods(rc, totalLaps);
      const strat = strategy(infos, stints, pits, totalLaps, neutralised);
      const pitLaps = new Map(strat.drivers.map((d) => [d.number, d.pitLaps]));
      const bucket = this.env.ANALYSIS;
      await Promise.all([
        putJson(bucket, analysisKey(season, round, "strategy"), strat),
        putJson(bucket, analysisKey(season, round, "pace"), pace(infos, laps, stints, pitLaps, totalLaps, neutralised)),
        putJson(bucket, analysisKey(season, round, "sectors"), sectors(infos, laps, pitLaps, neutralised)),
        putJson(bucket, analysisKey(season, round, "replay"), replay(infos, laps, positions, totalLaps)),
      ]);
      // Vuelta más rápida limpia de cada piloto: la que se compara en la telemetría (TEC-04).
      return infos.flatMap((d) => {
        const own = laps
          .filter((l) => l.driver_number === d.number && l.lap_duration && l.date_start && !l.is_pit_out_lap && l.lap_number > 1)
          .sort((a, b) => a.lap_duration! - b.lap_duration!)[0];
        if (!own) return [];
        const from = new Date(Date.parse(own.date_start!)).toISOString();
        const to = new Date(Date.parse(own.date_start!) + own.lap_duration! * 1000).toISOString();
        return [{ driver: d, number: d.number, lap: own.lap_number, from, to, lapTime: own.lap_duration! }];
      });
    });

    const telemetryDrivers: number[] = [];
    for (const t of targets) {
      const ok = await step.do(`telemetry-${t.number}`, STEP, async () => {
        const api = client();
        const [car, location] = await Promise.all([
          api.carData(sessionKey, t.number, t.from, t.to),
          api.location(sessionKey, t.number, t.from, t.to),
        ]);
        const data = telemetry(t.driver, t.lap, t.from, t.lapTime, car, location);
        if (!data) return false;
        await putJson(this.env.ANALYSIS, analysisKey(season, round, `telemetry/${t.number}`), data);
        return true;
      });
      if (ok) telemetryDrivers.push(t.number);
    }

    await step.do("index", async () => {
      const tools: ToolName[] = ["strategy", "pace", "sectors", "replay", ...(telemetryDrivers.length >= 2 ? (["telemetry"] as const) : [])];
      const index: AnalysisIndex = {
        season,
        round,
        version: ANALYSIS_VERSION,
        sessionKey,
        tools,
        telemetryDrivers,
        weather,
        createdAt: new Date().toISOString(),
      };
      await putJson(this.env.ANALYSIS, analysisKey(season, round, "index"), index);
      await createF1Writer(this.env.DB).saveAnalysis(index);
    });
    // Aviso a quien lo activó (COM-11), solo si la carrera es reciente.
    await step.do("notify", STEP, async () => notifyAnalysis(this.env, season, round, event.timestamp.getTime()));
    return { season, round, telemetryDrivers: telemetryDrivers.length };
  }
}

const INSTANCE = "analysis:instance";
const ACTIVE = new Set(["queued", "running", "waiting", "paused", "waitingForPause"]);
/** Tras terminar una carrera, OpenF1 tarda un rato en tener todo el histórico. */
const AFTER_RACE_MS = 3 * 3_600_000;

/**
 * Analiza las carreras pendientes desde 2023, de la más reciente a la más antigua, de una en una.
 * Una carrera que falla se marca y no se reintenta hasta que alguien borre la marca.
 */
export async function advanceAnalysis(env: Env, now = Date.now()): Promise<string> {
  const writer = createF1Writer(env.DB);
  const running = await writer.getState(INSTANCE);
  if (running) {
    const { status } = await (await env.POST_RACE.get(running)).status();
    if (ACTIVE.has(status)) return `activa: ${running}`;
    if (status === "errored" || status === "terminated") {
      const [, season, round] = running.split("-");
      await writer.setState(`analysis:failed:${season}:${round}`, new Date(now).toISOString());
    }
  }

  const reader = createF1Reader(env.DB);
  // Con una sesión en directo, OpenF1 no responde sin clave: ni se empieza (D-25).
  if (await liveSession(reader, now)) return "aplazada: sesión en directo";
  const candidates = await reader.racesWithoutAnalysis(OPENF1_FROM, new Date(now - AFTER_RACE_MS).toISOString(), 20, ANALYSIS_VERSION);
  for (const c of candidates) {
    if (await writer.getState(`analysis:failed:${c.season}:${c.round}`)) continue;
    const id = `postrace-${c.season}-${c.round}-${now}`;
    await env.POST_RACE.create({ id, params: { season: c.season, round: c.round } });
    await writer.setState(INSTANCE, id);
    return `creada: ${id}`;
  }
  if (running) await writer.setState(INSTANCE, "");
  return "al día";
}

/** Margen tras el final previsto de una sesión: retrasos y banderas rojas. */
const LIVE_MARGIN_MS = 45 * 60_000;
/**
 * OpenF1 cierra el acceso desde 30 minutos antes de cada sesión; un análisis tarda unos minutos, así que
 * no se empieza si la siguiente sesión arranca en menos de una hora.
 */
const BEFORE_SESSION_MS = 60 * 60_000;

/** ¿Hay una sesión de F1 en directo, recién terminada o a punto de empezar, según el calendario cargado? */
export async function liveSession(reader: ReturnType<typeof createF1Reader>, now: number): Promise<boolean> {
  const season = new Date(now).getUTCFullYear();
  const schedule = await reader.getSchedule(season, now);
  return schedule.some((r) =>
    r.sessions.some(
      (s) =>
        isSessionLive(s, now) ||
        isSessionLive(s, now - LIVE_MARGIN_MS) ||
        (s.startsAt !== null && Date.parse(s.startsAt) > now && Date.parse(s.startsAt) - now < BEFORE_SESSION_MS),
    ),
  );
}
