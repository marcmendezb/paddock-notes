import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { raceStart, sessionDurationMs } from "@paddock/shared";
import { IncoherentDataError } from "@paddock/shared/jolpica";
import type { Env } from "./env";
import { DeferredError } from "./http";
import { createJolpica, jolpicaContext } from "./jolpica";
import { QuarantineError, ingestLaps, ingestRound, ingestSchedule, type RoundContext } from "./rounds";

export { QuarantineError } from "./rounds";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Una sesión que terminó hace menos de esto se reingesta en cada cron de 15 min. */
const RECENT_WINDOW_MS = 6 * HOUR;
/** Rondas sin resultado que se cargan como máximo en una ejecución diaria. */
const MAX_MISSING_PER_RUN = 25;

interface TaskContext extends RoundContext {
  env: Env;
  rows: number;
}

/** Calendario de la temporada y, en la misma pasada, las rondas disputadas que aún no tienen resultado. */
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
 * Cron de 15 min: si una clasificación, un sprint o una carrera terminó en las últimas 6 h, reingesta esa
 * ronda (y sus vueltas, si fue la carrera). Si no, no llama a la fuente.
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
    const ref = { season, round: race.round, isSprintWeekend: race.isSprintWeekend, date: race.date };
    t.rows += await ingestRound(t, ref);
    if (ended.some((s) => s.kind === "race")) t.rows += await ingestLaps(t, season, race.round);
  }
}

/** Revisión semanal de sanciones posteriores en las tres últimas carreras disputadas. */
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

/** Ejecuta una tarea y la registra en `ingest_runs`. */
export async function runTask(env: Env, task: TaskName, now = Date.now()) {
  const ctx = jolpicaContext(env);
  const writer = createF1Writer(env.DB);
  const t: TaskContext = { env, jolpica: createJolpica(ctx), writer, now, rows: 0 };
  const season = new Date(now).getUTCFullYear();
  const id = crypto.randomUUID();

  // El cron de 15 min sin sesiones recientes no deja rastro en ingest_runs.
  if (task === "recent") {
    const schedule = await createF1Reader(env.DB).getSchedule(season, now);
    if (!schedule.some((r) => Math.abs(raceStart(r) - now) < 3 * DAY)) return { status: "skipped" as const };
  }

  await writer.startRun(id, task, new Date(now));
  try {
    if (task === "schedule") {
      await refreshSchedule(t, season);
      // Desde octubre, también el calendario siguiente, en cuanto Jolpica lo publique (NUC-07).
      if (new Date(now).getUTCMonth() >= 9) t.rows += (await ingestSchedule(t, season + 1)).length;
    }
    else if (task === "recent") await ingestRecent(t, season);
    else await weeklyCorrections(t, season);
    await writer.finishRun(id, { status: "ok", requests: ctx.counter.requests, rowsWritten: t.rows });
    return { status: "ok" as const, requests: ctx.counter.requests, rows: t.rows };
  } catch (error) {
    const quarantined = error instanceof QuarantineError || error instanceof IncoherentDataError;
    const detail = `${error instanceof DeferredError ? "aplazada: " : ""}${String(error)}`;
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
