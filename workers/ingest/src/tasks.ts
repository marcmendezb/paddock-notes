import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { raceStart, sessionDurationMs } from "@paddock/shared";
import { IncoherentDataError } from "@paddock/shared/jolpica";
import type { Env } from "./env";
import { DeferredError } from "./http";
import { createJolpica, jolpicaContext } from "./jolpica";
import { ingestProvisional } from "./provisional";
import { QuarantineError, ingestLaps, ingestRound, ingestSchedule, type RoundContext } from "./rounds";

export { QuarantineError } from "./rounds";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A session that ended less than this ago is re-ingested on every 15-minute cron. */
const RECENT_WINDOW_MS = 6 * HOUR;
/** Rounds without a result loaded at most in one daily run. */
const MAX_MISSING_PER_RUN = 25;

interface TaskContext extends RoundContext {
  env: Env;
  rows: number;
}

/** The season's calendar and, in the same pass, the rounds run that still have no result. */
async function refreshSchedule(t: TaskContext, season: number) {
  const rounds = await ingestSchedule(t, season);
  const reader = createF1Reader(t.env.DB);
  const missing = (await reader.getSchedule(season, t.now))
    .filter((r) => r.status === "completed" && !r.winner && raceStart(r) + sessionDurationMs("race") < t.now)
    .slice(0, MAX_MISSING_PER_RUN);
  for (const r of missing) {
    const ref = rounds.find((x) => x.round === r.round);
    if (ref) t.rows += await ingestRound(t, ref);
  }
}

/**
 * 15-minute cron: if a qualifying, sprint or race ended in the last 6 h, re-ingest that round (and its laps,
 * if it was the race). After a race, first of all, OpenF1's provisional result (D-31). Otherwise, it does
 * not call the source.
 */
async function ingestRecent(t: TaskContext, season: number) {
  const reader = createF1Reader(t.env.DB);
  const nearby = (await reader.getSchedule(season, t.now)).filter((r) => Math.abs(raceStart(r) - t.now) < 3 * DAY);
  for (const race of nearby) {
    const ended = race.sessions.filter((s) => {
      if (!s.startsAt || !["qualifying", "sprint", "race"].includes(s.kind)) return false;
      const end = Date.parse(s.startsAt) + sessionDurationMs(s.kind);
      return end <= t.now && t.now - end <= RECENT_WINDOW_MS;
    });
    if (ended.length === 0) continue;
    // First OpenF1's provisional result (D-31): minutes after the race, even if Jolpica is late or fails.
    // If it fails (OpenF1 closed for another live session, D-25), it does not stop the official attempt.
    if (ended.some((s) => s.kind === "race")) {
      try {
        t.rows += await ingestProvisional(t.env, race, t.now);
      } catch (error) {
        console.warn(JSON.stringify({ event: "provisional_failed", round: race.round, detail: String(error) }));
      }
    }
    const ref = { season, round: race.round, isSprintWeekend: race.isSprintWeekend, date: race.date };
    t.rows += await ingestRound(t, ref);
    if (ended.some((s) => s.kind === "race")) t.rows += await ingestLaps(t, season, race.round);
  }
}

/** Weekly review of later penalties in the last three races run. */
async function weeklyCorrections(t: TaskContext, season: number) {
  const reader = createF1Reader(t.env.DB);
  const completed = (await reader.getSchedule(season, t.now)).filter((r) => r.status === "completed").slice(-3);
  for (const r of completed) {
    t.rows += await ingestRound(t, { season, round: r.round, isSprintWeekend: r.isSprintWeekend, date: r.date });
  }
}

export type TaskName = "recent" | "schedule" | "corrections";

export const CRON_TASKS: Record<string, TaskName> = {
  "*/15 * * * *": "recent",
  "0 4 * * *": "schedule",
  "0 5 * * 1": "corrections",
};

/** Runs a job and records it in `ingest_runs`. */
export async function runTask(env: Env, task: TaskName, now = Date.now()) {
  const ctx = jolpicaContext(env);
  const writer = createF1Writer(env.DB);
  const t: TaskContext = { env, jolpica: createJolpica(ctx), writer, now, rows: 0 };
  const season = new Date(now).getUTCFullYear();
  const id = crypto.randomUUID();

  // The 15-minute cron with no recent sessions leaves no trace in ingest_runs.
  if (task === "recent") {
    const schedule = await createF1Reader(env.DB).getSchedule(season, now);
    if (!schedule.some((r) => Math.abs(raceStart(r) - now) < 3 * DAY)) return { status: "skipped" as const };
  }

  await writer.startRun(id, task, new Date(now));
  try {
    if (task === "schedule") {
      await refreshSchedule(t, season);
      // From October, the next calendar too, as soon as Jolpica publishes it (NUC-07).
      if (new Date(now).getUTCMonth() >= 9) t.rows += (await ingestSchedule(t, season + 1)).length;
    }
    else if (task === "recent") await ingestRecent(t, season);
    else await weeklyCorrections(t, season);
    await writer.finishRun(id, { status: "ok", requests: ctx.counter.requests, rowsWritten: t.rows });
    return { status: "ok" as const, requests: ctx.counter.requests, rows: t.rows };
  } catch (error) {
    const quarantined = error instanceof QuarantineError || error instanceof IncoherentDataError;
    const detail = `${error instanceof DeferredError ? "deferred: " : ""}${String(error)}`;
    await writer.finishRun(id, {
      status: quarantined ? "quarantined" : "error",
      requests: ctx.counter.requests,
      rowsWritten: t.rows,
      detail,
    });
    console.error(JSON.stringify({ event: "ingest_failed", task, quarantined, detail }));
    return { status: quarantined ? ("quarantined" as const) : ("error" as const), detail };
  }
}
