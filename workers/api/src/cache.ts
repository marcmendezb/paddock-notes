import type { Context } from "hono";
import { DATA_LICENSE, SOURCE_JOLPICA, type ApiEnvelope } from "@paddock/shared";
import type { AppEnv } from "./env";
import { HttpError } from "./errors";

export interface Payload<T> {
  data: T;
  /** `ingest_state` resources that feed the response. */
  updatedAt: string | null;
  /** Ingestion is behind what was expected (D-06). */
  stale?: boolean;
}

export interface CacheOptions {
  /** Seconds of edge caching. */
  ttl: number;
  /** Keep a last-resort copy in KV, for when D1 fails (stack.md §8.3). */
  kvFallback?: boolean;
  /** Source of the data (D-12). Jolpica F1 by default. */
  source?: string;
  /**
   * An extra part of the key: when it changes, the previous copy is no longer served. Analyses use it with
   * their version and date, so a redone analysis shows at once and not when the cache expires.
   */
  variant?: string;
}

const KV_PREFIX = "last-good:";
const KV_TTL_SECONDS = 7 * 24 * 3600;
/**
 * The last-good copy is refreshed at most once an hour: every Cache API miss (one per minute and data
 * centre on 60 s routes) would otherwise spend the free plan's 1,000 KV writes a day in a few hours (D-39).
 */
const KV_REFRESH_MS = 3600 * 1000;

/** Writes the last-good copy unless the stored one is younger than KV_REFRESH_MS. */
export async function saveLastGood(kv: KVNamespace, key: string, envelope: unknown): Promise<void> {
  const { metadata } = await kv.getWithMetadata<{ savedAt?: number }>(key, "text");
  if (metadata?.savedAt && Date.now() - metadata.savedAt < KV_REFRESH_MS) return;
  await kv.put(key, JSON.stringify(envelope), { expirationTtl: KV_TTL_SECONDS, metadata: { savedAt: Date.now() } });
}

/** A normalised cache key: the path only, no query (read routes accept no parameters). */
function cacheKey(c: Context<AppEnv>, variant?: string): Request {
  const url = new URL(c.req.url);
  const suffix = variant ? `?v=${encodeURIComponent(variant)}` : "";
  return new Request(`https://cache.paddocknotes.internal${url.pathname}${suffix}`, { method: "GET" });
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
 * Serves a read response from the Cache API; if it is not there, computes it with D1 and stores it.
 * If D1 fails, serves the KV copy with `X-Data-Stale: true`, or 503 if there is none.
 */
export async function cached<T>(
  c: Context<AppEnv>,
  options: CacheOptions,
  load: () => Promise<Payload<T> | null>,
): Promise<Response> {
  const key = cacheKey(c, options.variant);
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
    throw new HttpError("unavailable", "Service unavailable. Please try again in a few seconds.", 30);
  }
  if (!payload) throw new HttpError("not_found", "No data available for this resource yet.");

  const envelope: ApiEnvelope<T> = {
    data: payload.data,
    source: [options.source ?? SOURCE_JOLPICA],
    license: DATA_LICENSE,
    updated_at: payload.updatedAt,
  };
  const stale = payload.stale ?? false;
  // Late data is cached briefly, to pick up the ingestion as soon as it arrives.
  const response = respond(c, envelope, stale ? Math.min(options.ttl, 60) : options.ttl, stale);
  c.executionCtx.waitUntil(
    Promise.all([
      cache.put(key, response.clone()),
      options.kvFallback ? saveLastGood(c.env.CACHE, KV_PREFIX + key.url, envelope) : null,
    ]),
  );
  return response;
}
