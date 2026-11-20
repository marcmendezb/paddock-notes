import { DurableObject } from "cloudflare:workers";

/**
 * Global outbound request limiter (D-10): one instance per host.
 * The cron and the Workflows share the count even when they run at the same time.
 * It keeps the instants of the requests in the last window in the Durable Object's storage.
 */
export interface LimitPolicy {
  perSecond: number;
  perWindow: number;
  windowMs: number;
}

export interface Permit {
  /** 0 if permission is granted; otherwise, the milliseconds to wait before asking again. */
  waitMs: number;
}

const STATE_KEY = "state";

interface State {
  stamps: number[];
  blockedUntil: number;
}

export class OutboundLimiter extends DurableObject {
  private state: State | null = null;

  private async load(): Promise<State> {
    this.state ??= (await this.ctx.storage.get<State>(STATE_KEY)) ?? { stamps: [], blockedUntil: 0 };
    return this.state;
  }

  async acquire(policy: LimitPolicy, now = Date.now()): Promise<Permit> {
    const state = await this.load();
    if (state.blockedUntil > now) return { waitMs: state.blockedUntil - now };

    state.stamps = state.stamps.filter((t) => t > now - policy.windowMs);
    const lastSecond = state.stamps.filter((t) => t > now - 1000);

    if (state.stamps.length >= policy.perWindow) {
      return { waitMs: state.stamps[0]! + policy.windowMs - now };
    }
    if (lastSecond.length >= policy.perSecond) {
      return { waitMs: lastSecond[0]! + 1000 - now };
    }

    state.stamps.push(now);
    await this.ctx.storage.put(STATE_KEY, state);
    return { waitMs: 0 };
  }

  /** The source answered 429: it is not called again until `Retry-After` has passed. */
  async penalize(retryAfterMs: number, now = Date.now()): Promise<void> {
    const state = await this.load();
    state.blockedUntil = Math.max(state.blockedUntil, now + retryAfterMs);
    await this.ctx.storage.put(STATE_KEY, state);
  }
}
