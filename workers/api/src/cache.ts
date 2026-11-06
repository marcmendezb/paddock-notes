import type { Context } from "hono";
import { DATA_LICENSE, SOURCE_JOLPICA, type ApiEnvelope } from "@paddock/shared";
import type { AppEnv } from "./env";
import { HttpError } from "./errors";

export interface Payload<T> {
  data: T;
  /** Recursos de `ingest_state` que alimentan la respuesta. */
  updatedAt: string | null;
  /** La ingesta va retrasada respecto a lo esperado (D-06). */
  stale?: boolean;
}

export interface CacheOptions {
  /** Segundos de caché en el borde. */
  ttl: number;
  /** Guardar una copia de último recurso en KV, para cuando D1 falle (stack.md §8.3). */
  kvFallback?: boolean;
  /** Fuente de los datos (D-12). Por defecto, Jolpica F1. */
  source?: string;
}

const KV_PREFIX = "last-good:";
const KV_TTL_SECONDS = 7 * 24 * 3600;

/** Clave de caché normalizada: solo la ruta, sin consulta (las rutas de lectura no admiten parámetros). */
function cacheKey(c: Context<AppEnv>): Request {
  const url = new URL(c.req.url);
  return new Request(`https://cache.paddocknotes.internal${url.pathname}`, { method: "GET" });
}

function respond<T>(c: Context<AppEnv>, envelope: ApiEnvelope<T>, ttl: number, stale: boolean): Response {
  const headers: Record<string, string> = {
    "cache-control": `public, max-age=${ttl}`,
    "content-type": "application/json; charset=utf-8",
  };
  if (stale) headers["x-data-stale"] = "true";
  return new Response(JSON.stringify(envelope), { status: 200, headers });
}

/**
 * Sirve una respuesta de lectura desde la Cache API; si no está, la calcula con D1 y la guarda.
 * Si D1 falla, sirve la copia de KV con `X-Data-Stale: true`, o 503 si no la hay.
 */
export async function cached<T>(
  c: Context<AppEnv>,
  options: CacheOptions,
  load: () => Promise<Payload<T> | null>,
): Promise<Response> {
  const key = cacheKey(c);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return hit;

  let payload: Payload<T> | null;
  try {
    payload = await load();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error(JSON.stringify({ event: "d1_error", path: new URL(c.req.url).pathname, error: String(error) }));
    const copy = options.kvFallback ? await c.env.CACHE.get<ApiEnvelope<T>>(KV_PREFIX + key.url, "json") : null;
    if (copy) return respond(c, copy, 30, true);
    throw new HttpError("unavailable", "El servicio no está disponible. Vuelve a intentarlo en unos segundos.", 30);
  }
  if (!payload) throw new HttpError("not_found", "No hay datos para este recurso todavía.");

  const envelope: ApiEnvelope<T> = {
    data: payload.data,
    source: [options.source ?? SOURCE_JOLPICA],
    license: DATA_LICENSE,
    updated_at: payload.updatedAt,
  };
  const stale = payload.stale ?? false;
  // Un dato retrasado se cachea poco tiempo, para recoger la ingesta en cuanto llegue.
  const response = respond(c, envelope, stale ? Math.min(options.ttl, 60) : options.ttl, stale);
  c.executionCtx.waitUntil(
    Promise.all([
      cache.put(key, response.clone()),
      options.kvFallback
        ? c.env.CACHE.put(KV_PREFIX + key.url, JSON.stringify(envelope), { expirationTtl: KV_TTL_SECONDS })
        : null,
    ]),
  );
  return response;
}
