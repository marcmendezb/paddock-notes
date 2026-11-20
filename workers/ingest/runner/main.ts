/**
 * The Jolpica half of ingestion, run from GitHub Actions (`.github/workflows/ingest.yml`, D-40).
 *
 * Jolpica sits behind Cloudflare and limits by IP. A Worker reaches another Cloudflare site from an internal
 * address that every Worker shares, so that budget is always spent and Jolpica answers 429. This runner
 * uses the same code as the Worker (tasks.ts, rounds.ts, fetchJson with its host list, limiter rule and Zod
 * validation) from a GitHub runner, and writes to D1 through the REST API. OpenF1 is not behind Cloudflare:
 * the post-race analysis stays in the Worker.
 *
 * Usage: tsx runner/main.ts <task…>, tasks: recent | schedule | corrections | backfill.
 * Needs CLOUDFLARE_API_TOKEN (D1: Edit) and CLOUDFLARE_ACCOUNT_ID. Settings come from wrangler.jsonc;
 * D1_DATABASE_ID and RUN_BUDGET_MS override the database and the time budget.
 */
import { createF1Writer } from "@paddock/db/f1-write";
import { resourceKey } from "@paddock/db/schema";
import { FIRST_SEASON } from "@paddock/shared";
import type { Env } from "../src/env";
import { DeferredError } from "../src/http";
import { createJolpica, jolpicaContext } from "../src/jolpica";
import { acquirePermit, emptyLimiterState, penalizeState, type LimiterState, type LimitPolicy } from "../src/limit-policy";
import { ingestRound, ingestSchedule } from "../src/rounds";
import { runTask, type TaskName } from "../src/tasks";
import { d1OverHttp } from "./d1-http";

declare const process: { env: Record<string, string | undefined>; argv: string[]; exitCode?: number };

/** A run stops starting history rounds after this long: the job has a 20-minute timeout. */
const RUN_BUDGET_MS = Number(process.env.RUN_BUDGET_MS ?? 10 * 60_000);
/**
 * History rows written a day (UTC). D1's free plan allows 100,000 rows written a day, indexes included
 * (about three per row here), and live ingestion needs its share (D-39).
 */
const BACKFILL_ROWS_PER_DAY = 25_000;
const SEASON = "runner:backfill-season";
const ROUND = "runner:backfill-round";

/** The limiter rule (D-10) with its state in memory: one runner, one run. */
function memoryLimiters(): DurableObjectNamespace {
  const states = new Map<string, LimiterState>();
  const state = (host: string) => states.get(host) ?? states.set(host, emptyLimiterState()).get(host)!;
  return {
    idFromName: (name: string) => name,
    get: (host: string) => ({
      acquire: async (policy: LimitPolicy, now = Date.now()) => acquirePermit(state(host), policy, now),
      penalize: async (ms: number, now = Date.now()) => penalizeState(state(host), ms, now),
    }),
  } as unknown as DurableObjectNamespace;
}

async function loadEnv(): Promise<Env> {
  const { unstable_readConfig } = (await import("wrangler")) as unknown as {
    unstable_readConfig: (o: { config: string }) => { vars?: Record<string, string>; d1_databases?: { database_id?: string }[] };
  };
  const config = unstable_readConfig({ config: "wrangler.jsonc" });
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  // D1_DATABASE_ID points a run at another database (the preview one, to try it out).
  const databaseId = process.env.D1_DATABASE_ID ?? config.d1_databases?.[0]?.database_id;
  if (!token || !accountId || !databaseId) throw new Error("CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and a D1 database are required");
  return {
    ...config.vars,
    // A run has minutes to spare: it waits out Jolpica's one-minute pause after a 429 instead of deferring.
    OUTBOUND_MAX_WAIT_MS: "90000",
    DB: d1OverHttp({ accountId, databaseId, token }),
    OUTBOUND_LIMITER: memoryLimiters(),
  } as unknown as Env;
}

/**
 * The history (D-11), round by round from the current season back to 1950, with its progress in
 * ingest_state: each run picks up where the last one stopped. Every round is idempotent.
 */
async function backfill(env: Env, deadline: number): Promise<string> {
  const writer = createF1Writer(env.DB);
  const today = new Date().toISOString().slice(0, 10);
  const rowsKey = `runner:backfill-rows:${today}`;
  let rowsToday = Number((await writer.getState(rowsKey)) ?? 0);

  for (;;) {
    const season = Number((await writer.getState(SEASON)) || new Date().getUTCFullYear());
    if (season < FIRST_SEASON) return "complete";
    const c = { jolpica: createJolpica(jolpicaContext(env, { backfill: true })), writer, now: Date.now() };
    const rounds = (await ingestSchedule(c, season)).filter((r) => Date.parse(`${r.date}T23:59:59Z`) < Date.now());
    const from = Number((await writer.getState(ROUND)) || 1);
    for (const ref of rounds.filter((r) => r.round >= from)) {
      if (Date.now() > deadline) return `paused at ${season}/${ref.round} (time)`;
      if (rowsToday >= BACKFILL_ROWS_PER_DAY) return `paused at ${season}/${ref.round} (rows today: ${rowsToday})`;
      rowsToday += await ingestRound(c, ref);
      await writer.setState(ROUND, String(ref.round + 1));
      await writer.setState(rowsKey, String(rowsToday));
    }
    await writer.setState(resourceKey.backfill(season), new Date().toISOString());
    await writer.setState(SEASON, String(season - 1));
    await writer.setState(ROUND, "1");
    console.log(JSON.stringify({ event: "backfill_season", season, rowsToday }));
  }
}

async function main() {
  const tasks = process.argv.slice(2);
  const known = new Set(["recent", "schedule", "corrections", "backfill"]);
  if (tasks.length === 0 || tasks.some((t) => !known.has(t))) throw new Error(`Usage: main.ts <${[...known].join(" | ")}>…`);
  const env = await loadEnv();
  const deadline = Date.now() + RUN_BUDGET_MS;
  let failed = false;

  for (const task of tasks) {
    if (task === "backfill") {
      try {
        console.log(JSON.stringify({ event: "backfill", state: await backfill(env, deadline) }));
      } catch (error) {
        // The limiter's budget for this run is spent: the next run carries on.
        if (error instanceof DeferredError) console.log(JSON.stringify({ event: "backfill", state: `deferred: ${error.message}` }));
        else throw error;
      }
      continue;
    }
    const result = await runTask(env, task as TaskName);
    console.log(JSON.stringify({ event: "task", task, ...result }));
    // A deferral (the source asked for a pause) is not a failure: the next run carries on.
    const deferred = result.status === "error" && result.detail?.startsWith("deferred:");
    if ((result.status === "error" && !deferred) || result.status === "quarantined") failed = true;
  }
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
