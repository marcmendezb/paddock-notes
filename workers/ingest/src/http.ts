import type { z } from "zod";
import { ALLOWED_OUTBOUND_HOSTS, userAgent } from "@paddock/shared";
import type { Env } from "./env";
import type { LimitPolicy } from "./limit-policy";

/** Common rules for any external API (apis.md §8). */
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RETRIES = 3;
/** Maximum wait within one invocation; if the limiter asks for more, the job is deferred. */
const MAX_WAIT_MS = 30_000;

export class OutboundError extends Error {
  override name = "OutboundError";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** The limiter asks for a longer wait than is reasonable in this invocation: retried on the next cron. */
export class DeferredError extends OutboundError {
  override name = "DeferredError";
}

/**
 * OpenF1 closes keyless access, the history included, while an F1 session is live (a 401 with "Live F1
 * session in progress", observed on 6 November 2026). It is not our error or the data's: try again once
 * the session ends (D-25).
 */
export class LiveSessionError extends DeferredError {
  override name = "LiveSessionError";
}

/** The limiter's pause after a live-session 401: no other request tries before it ends. */
const LIVE_SESSION_PAUSE_MS = 15 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(header: string | null, fallback: number): number {
  if (!header) return fallback;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? fallback : Math.max(0, date - Date.now());
}

export interface FetchContext {
  env: Env;
  policy: LimitPolicy;
  /** Count of requests made in this run (for `ingest_runs`). */
  counter: { requests: number };
  /** Maximum wait for the limiter's permission before deferring the job (30 s by default). */
  maxWaitMs?: number;
}

async function waitForPermit(ctx: FetchContext, host: string): Promise<void> {
  const limiter = ctx.env.OUTBOUND_LIMITER.get(ctx.env.OUTBOUND_LIMITER.idFromName(host));
  let waited = 0;
  for (;;) {
    // If the Durable Object does not answer, the call throws and the request is not made (fails closed).
    const { waitMs } = await limiter.acquire(ctx.policy);
    if (waitMs === 0) return;
    if (waited + waitMs > (ctx.maxWaitMs ?? MAX_WAIT_MS)) throw new DeferredError(`${host} limit reached; wait of ${waitMs} ms`);
    waited += waitMs;
    await sleep(waitMs);
  }
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) throw new OutboundError(`respuesta demasiado grande (${declared} bytes)`);
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new OutboundError("respuesta demasiado grande");
  return text;
}

/**
 * GET to an external API: a closed list of hosts, a global limiter, a timeout, retries with exponential
 * backoff only on 429/5xx/network, respect for `Retry-After` and Zod validation of the response.
 */
export async function fetchJson<S extends z.ZodType>(ctx: FetchContext, url: string, schema: S): Promise<z.output<S>> {
  const { hostname, protocol } = new URL(url);
  if (protocol !== "https:" || !(ALLOWED_OUTBOUND_HOSTS as readonly string[]).includes(hostname)) {
    throw new OutboundError(`Disallowed host: ${hostname}`);
  }
  const limiter = ctx.env.OUTBOUND_LIMITER.get(ctx.env.OUTBOUND_LIMITER.idFromName(hostname));

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(Math.min(8000, 500 * 2 ** attempt) * (0.5 + Math.random()));
    await waitForPermit(ctx, hostname);
    ctx.counter.requests++;
    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "user-agent": userAgent(ctx.env.SITE_URL), accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      console.warn(JSON.stringify({ event: "outbound_error", host: hostname, url, attempt, error: String(error) }));
      lastError = error;
      continue;
    }
    console.log(
      JSON.stringify({ event: "outbound", host: hostname, url, status: response.status, ms: Date.now() - started }),
    );

    if (response.status === 429) {
      await limiter.penalize(retryAfterMs(response.headers.get("retry-after"), 60_000));
      lastError = new OutboundError("429 de la fuente", 429);
      continue;
    }
    if (response.status >= 500) {
      lastError = new OutboundError(`error ${response.status} de la fuente`, response.status);
      continue;
    }
    if (response.status === 401 && hostname === "api.openf1.org") {
      const detail = await readLimited(response).catch(() => "");
      if (/live f1 session/i.test(detail)) {
        await limiter.penalize(LIVE_SESSION_PAUSE_MS);
        throw new LiveSessionError("OpenF1 restricted during a live session", 401);
      }
    }
    if (!response.ok) throw new OutboundError(`error ${response.status} de la fuente`, response.status);

    let body: unknown;
    try {
      body = JSON.parse(await readLimited(response));
    } catch (error) {
      if (error instanceof OutboundError) throw error;
      throw new OutboundError("the response is not valid JSON");
    }
    // A response that does not match the schema is not written (security.md §8).
    return schema.parse(body);
  }
  throw lastError instanceof Error ? lastError : new OutboundError("la fuente no responde");
}
