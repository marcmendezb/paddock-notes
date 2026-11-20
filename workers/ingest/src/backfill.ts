import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createF1Writer } from "@paddock/db/f1-write";
import { resourceKey } from "@paddock/db/schema";
import { FIRST_SEASON } from "@paddock/shared";
import type { Env } from "./env";
import { createJolpica, jolpicaContext } from "./jolpica";
import { ingestLaps, ingestRound, ingestSchedule, type RoundContext, type RoundRef } from "./rounds";

/**
 * History backfill (D-11): one instance per season, one step per round and another for its laps.
 * If the limiter asks to wait more than 30 s, the step fails with DeferredError and the Workflow retries it
 * later. Every step is idempotent.
 */
const STEP = {
  retries: { limit: 30, delay: "10 minutes", backoff: "constant" },
  timeout: "10 minutes",
} as const;

export interface BackfillParams {
  season: number;
}

export class BackfillWorkflow extends WorkflowEntrypoint<Env, BackfillParams> {
  override async run(event: WorkflowEvent<BackfillParams>, step: WorkflowStep) {
    const { season } = event.payload;
    const context = (): RoundContext => ({
      jolpica: createJolpica(jolpicaContext(this.env, { backfill: true })),
      writer: createF1Writer(this.env.DB),
      now: Date.now(),
    });

    const rounds: RoundRef[] = await step.do("schedule", STEP, async () => {
      const all = await ingestSchedule(context(), season);
      // Only the rounds already run.
      return all.filter((r) => Date.parse(`${r.date}T23:59:59Z`) < Date.now());
    });

    let rows = 0;
    for (const ref of rounds) {
      rows += await step.do(`round-${ref.round}`, STEP, () => ingestRound(context(), ref));
      if (this.env.BACKFILL_LAPS !== "false") {
        rows += await step.do(`laps-${ref.round}`, STEP, () => ingestLaps(context(), season, ref.round));
      }
    }

    await step.do("done", () => createF1Writer(this.env.DB).setState(resourceKey.backfill(season), new Date().toISOString()));
    return { season, rounds: rounds.length, rows };
  }
}

const CURSOR = "backfill:cursor";
const INSTANCE = "backfill:instance";
const ACTIVE = new Set(["queued", "running", "waiting", "paused", "waitingForPause"]);
/** A season takes around 1.5 h. If an instance is still active after 12 h, it is considered stuck. */
const STUCK_AFTER_MS = 12 * 3_600_000;

/** The instance ID carries the season and the creation instant: backfill-{season}-{ms}. */
function parseInstance(id: string): { season: number; createdAt: number } {
  const [, season, createdAt] = id.split("-");
  return { season: Number(season), createdAt: Number(createdAt) };
}

/**
 * Advances the history backfill from the current season back to 1950, one season at a time.
 * It is called on every 15-minute cron and does nothing while an instance is active.
 */
export async function advanceBackfill(env: Env, now = Date.now()): Promise<string> {
  const writer = createF1Writer(env.DB);
  const running = await writer.getState(INSTANCE);

  if (running) {
    const instance = await env.BACKFILL.get(running);
    const { status } = await instance.status();
    const { season, createdAt } = parseInstance(running);
    const stuck = ACTIVE.has(status) && now - createdAt > STUCK_AFTER_MS;
    if (stuck) await instance.terminate();
    if (ACTIVE.has(status) && !stuck) return `activa: ${running}`;
    if (stuck || status === "errored" || status === "terminated") {
      const id = `backfill-${season}-${now}`;
      await env.BACKFILL.create({ id, params: { season } });
      await writer.setState(INSTANCE, id);
      return `reintentada: ${id}`;
    }
  }

  const cursor = Number((await writer.getState(CURSOR)) ?? new Date(now).getUTCFullYear());
  if (cursor < FIRST_SEASON) {
    if (running) await writer.setState(INSTANCE, "");
    return "completa";
  }
  const id = `backfill-${cursor}-${now}`;
  await env.BACKFILL.create({ id, params: { season: cursor } });
  await writer.setState(INSTANCE, id);
  await writer.setState(CURSOR, String(cursor - 1));
  return `creada: ${id}`;
}
