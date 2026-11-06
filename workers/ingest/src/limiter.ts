import { DurableObject } from "cloudflare:workers";

/**
 * Limitador global de peticiones salientes (D-10): una instancia por host.
 * El cron y los Workflows comparten la cuenta aunque se ejecuten a la vez.
 * Guarda los instantes de las peticiones de la última ventana en el almacenamiento del Durable Object.
 */
export interface LimitPolicy {
  perSecond: number;
  perWindow: number;
  windowMs: number;
}

export interface Permit {
  /** 0 si se concede el permiso; si no, milisegundos que hay que esperar antes de volver a pedirlo. */
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

  /** La fuente respondió 429: no se le vuelve a llamar hasta que pase `Retry-After`. */
  async penalize(retryAfterMs: number, now = Date.now()): Promise<void> {
    const state = await this.load();
    state.blockedUntil = Math.max(state.blockedUntil, now + retryAfterMs);
    await this.ctx.storage.put(STATE_KEY, state);
  }
}
