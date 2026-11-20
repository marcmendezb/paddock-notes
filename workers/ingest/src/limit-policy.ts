/**
 * The outbound limiter's rule (D-10), with no Cloudflare dependency: the Durable Object (limiter.ts) keeps
 * the state between invocations, and the GitHub Actions runner (runner/, D-40) keeps it in memory for one run.
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

export interface LimiterState {
  stamps: number[];
  blockedUntil: number;
}

export const emptyLimiterState = (): LimiterState => ({ stamps: [], blockedUntil: 0 });

/** Grants a request (recording it in `state`) or says how long to wait. */
export function acquirePermit(state: LimiterState, policy: LimitPolicy, now: number): Permit {
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
  return { waitMs: 0 };
}

/** The source answered 429: it is not called again until `Retry-After` has passed. */
export function penalizeState(state: LimiterState, retryAfterMs: number, now: number): void {
  state.blockedUntil = Math.max(state.blockedUntil, now + retryAfterMs);
}
