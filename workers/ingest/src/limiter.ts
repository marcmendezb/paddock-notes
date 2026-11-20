import { DurableObject } from "cloudflare:workers";
import { acquirePermit, emptyLimiterState, penalizeState, type LimiterState, type LimitPolicy, type Permit } from "./limit-policy";

export type { LimitPolicy, Permit } from "./limit-policy";

/**
 * Global outbound request limiter (D-10): one instance per host.
 * The cron and the Workflows share the count even when they run at the same time.
 * It keeps the instants of the requests in the last window in the Durable Object's storage; the rule itself
 * is in limit-policy.ts, shared with the GitHub Actions runner (D-40).
 */
const STATE_KEY = "state";

export class OutboundLimiter extends DurableObject {
  private state: LimiterState | null = null;

  private async load(): Promise<LimiterState> {
    this.state ??= (await this.ctx.storage.get<LimiterState>(STATE_KEY)) ?? emptyLimiterState();
    return this.state;
  }

  async acquire(policy: LimitPolicy, now = Date.now()): Promise<Permit> {
    const state = await this.load();
    const permit = acquirePermit(state, policy, now);
    if (permit.waitMs === 0) await this.ctx.storage.put(STATE_KEY, state);
    return permit;
  }

  /** The source answered 429: it is not called again until `Retry-After` has passed. */
  async penalize(retryAfterMs: number, now = Date.now()): Promise<void> {
    const state = await this.load();
    penalizeState(state, retryAfterMs, now);
    await this.ctx.storage.put(STATE_KEY, state);
  }
}
