import type { z } from "zod";
import { ALLOWED_OUTBOUND_HOSTS, userAgent } from "@paddock/shared";
import type { Env } from "./env";
import type { LimitPolicy } from "./limiter";

/** Reglas comunes para cualquier API externa (apis.md §8). */
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RETRIES = 3;
/** Espera máxima dentro de una invocación; si el limitador pide más, la tarea se aplaza. */
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

/** El limitador pide esperar más de lo razonable en esta invocación: se reintenta en el siguiente cron. */
export class DeferredError extends OutboundError {
  override name = "DeferredError";
}

/**
 * OpenF1 cierra el acceso sin clave, incluido el histórico, mientras hay una sesión de F1 en directo
 * (respuesta 401 con «Live F1 session in progress», observada el 6 de noviembre de 2026). No es un error
 * nuestro ni de los datos: hay que volver a intentarlo cuando termine la sesión (D-25).
 */
export class LiveSessionError extends DeferredError {
  override name = "LiveSessionError";
}

/** Pausa del limitador tras un 401 por sesión en directo: ninguna otra petición lo intenta antes. */
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
  /** Contador de peticiones hechas en esta ejecución (para `ingest_runs`). */
  counter: { requests: number };
  /** Espera máxima por un permiso del limitador antes de aplazar la tarea (por defecto, 30 s). */
  maxWaitMs?: number;
}

async function waitForPermit(ctx: FetchContext, host: string): Promise<void> {
  const limiter = ctx.env.OUTBOUND_LIMITER.get(ctx.env.OUTBOUND_LIMITER.idFromName(host));
  let waited = 0;
  for (;;) {
    // Si el Durable Object no responde, la llamada lanza y la petición no se hace (falla cerrado).
    const { waitMs } = await limiter.acquire(ctx.policy);
    if (waitMs === 0) return;
    if (waited + waitMs > (ctx.maxWaitMs ?? MAX_WAIT_MS)) throw new DeferredError(`límite de ${host} alcanzado; espera de ${waitMs} ms`);
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
 * GET a una API externa: lista cerrada de hosts, limitador global, tiempo máximo, reintentos con espera
 * exponencial solo en 429/5xx/red, respeto de `Retry-After` y validación Zod de la respuesta.
 */
export async function fetchJson<S extends z.ZodType>(ctx: FetchContext, url: string, schema: S): Promise<z.output<S>> {
  const { hostname, protocol } = new URL(url);
  if (protocol !== "https:" || !(ALLOWED_OUTBOUND_HOSTS as readonly string[]).includes(hostname)) {
    throw new OutboundError(`host no permitido: ${hostname}`);
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
        throw new LiveSessionError("OpenF1 restringido durante una sesión en directo", 401);
      }
    }
    if (!response.ok) throw new OutboundError(`error ${response.status} de la fuente`, response.status);

    let body: unknown;
    try {
      body = JSON.parse(await readLimited(response));
    } catch (error) {
      if (error instanceof OutboundError) throw error;
      throw new OutboundError("la respuesta no es JSON válido");
    }
    // Una respuesta que no cumple el esquema no se escribe (seguridad.md §8).
    return schema.parse(body);
  }
  throw lastError instanceof Error ? lastError : new OutboundError("la fuente no responde");
}
