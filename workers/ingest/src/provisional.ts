import type { z } from "zod";
import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { raceStart, type RaceSummary } from "@paddock/shared";
import type { driverSchema, sessionResultSchema } from "@paddock/shared/openf1";
import type { Env } from "./env";
import { createOpenF1, openf1Context } from "./openf1";

/**
 * The race's provisional result (D-31). OpenF1 publishes the session classification minutes after the
 * chequered flag; Jolpica, hours later (and sometimes goes down right then). While there is no official
 * result, OpenF1's is stored in `provisional_results`, which the API serves marked as provisional and which
 * does not count towards standings or records. As soon as the official one exists, it is deleted.
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
/** Rookies that can be skipped without discarding the whole result. */
const MAX_UNMATCHED = 2;

/** 5723.504 s → "1:35:23.504", like the winner's time in Jolpica. */
function raceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${h}:${String(m).padStart(2, "0")}:${s}`;
}

/** 0.799 → "+0.799"; 62.345 → "+1:02.345", like Jolpica's gaps. */
function gapText(seconds: number): string {
  if (seconds < 60) return `+${seconds.toFixed(3)}`;
  const m = Math.floor(seconds / 60);
  return `+${m}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
}

/**
 * Turns OpenF1's classification into our rows. Each driver is matched by their three-letter code to the
 * season's grid. A rookie is not on it yet (has no Jolpica identifier, and none is invented): up to two are
 * skipped, unless they are on the podium. Returns null, and nothing is written, if anything else does not
 * add up: repeated positions, no winner or an impossible number of cars. Better nothing than a wrong
 * result.
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

/** OpenF1's race session for a round: the one starting within 6 h of our time. */
export function matchSession<T extends { date_start: string }>(sessions: T[], race: RaceSummary): T | null {
  const start = raceStart(race);
  let best: T | null = null;
  for (const s of sessions) {
    const diff = Math.abs(Date.parse(s.date_start) - start);
    if (diff < 6 * HOUR && (!best || diff < Math.abs(Date.parse(best.date_start) - start))) best = s;
  }
  return best;
}

/** Writes (or deletes, if the official one exists) the provisional result of a finished race. */
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
  // Still on track: OpenF1's classification is not final yet.
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
