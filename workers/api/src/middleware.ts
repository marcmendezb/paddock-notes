import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./env";
import { errorResponse } from "./errors";

/** Security headers on every API response (security.md §4). */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  // Responses served from the Cache API have immutable headers: they are copied.
  c.res = new Response(c.res.body, c.res);
  const h = c.res.headers;
  h.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("x-frame-options", "DENY");
  h.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  // The public read API can be consumed from other origins (D-07).
  h.set("cross-origin-resource-policy", "cross-origin");
};

/** Community routes (phase 4): they change state, carry a session and are not cached. */
export const COMMUNITY_PREFIXES = [
  "/api/v1/auth",
  "/api/v1/me",
  "/api/v1/predictions",
  "/api/v1/leagues",
  "/api/v1/quiz-scores",
  "/api/v1/reports",
  "/api/v1/newsletter",
];
const under = (prefixes: string[], path: string) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));
export const isCommunity = (path: string) => under(COMMUNITY_PREFIXES, path);
/**
 * One-click unsubscribe (RFC 8058): the recipient's mail provider POSTs without Origin or cookies. The
 * token in the URL is the only credential and can only unsubscribe, so the CSRF check does not apply.
 */
export const isOneClick = (path: string) => under(["/api/v1/email/unsubscribe"], path);

const trusted = (c: { env: AppEnv["Bindings"] }) => c.env.TRUSTED_ORIGINS.split(",");

/**
 * CORS (D-07): public reads open and without credentials; community routes only for our own origins,
 * with credentials.
 */
export const publicCors: MiddlewareHandler<AppEnv> = async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  if (isCommunity(pathname) || isOneClick(pathname)) {
    const origin = c.req.header("origin");
    const allowed = origin && trusted(c).includes(origin) ? origin : null;
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: allowed
          ? {
              "access-control-allow-origin": allowed,
              "access-control-allow-credentials": "true",
              "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
              "access-control-allow-headers": "content-type, x-captcha-response",
              vary: "origin",
            }
          : {},
      });
    }
    await next();
    c.res = new Response(c.res.body, c.res);
    if (allowed) {
      c.res.headers.set("access-control-allow-origin", allowed);
      c.res.headers.set("access-control-allow-credentials", "true");
    }
    c.res.headers.set("vary", "origin");
    c.res.headers.set("cache-control", "no-store");
    return;
  }
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
        "access-control-max-age": "86400",
      },
    });
  }
  await next();
  c.res = new Response(c.res.body, c.res);
  c.res.headers.set("access-control-allow-origin", "*");
  c.res.headers.set("access-control-expose-headers", "x-data-stale, retry-after");
};

/**
 * Allowed methods (security.md §6): the public API only reads; community routes also accept POST and
 * DELETE, with an Origin check (CSRF) and a per-IP write limit.
 */
export const readOnlyMethods: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (isOneClick(path) && c.req.method === "POST") {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-client-ip") ?? "internal";
    const { success } = await c.env.RATE_LIMIT_WRITE.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Too many requests. Please wait a minute.", 60);
    await next();
    return;
  }
  if (isCommunity(path) && ["POST", "DELETE"].includes(c.req.method)) {
    // From the internet the browser's Origin arrives. Over the Service Binding the web app cannot forward it
    // (it is a forbidden header in fetch) and sends x-paddock-origin, which only counts if the request is
    // internal: from the internet Cloudflare always sets CF-Connecting-IP.
    const internal = !c.req.header("cf-connecting-ip");
    const origin = c.req.header("origin") ?? (internal ? c.req.header("x-paddock-origin") : undefined);
    if (!origin || !trusted(c).includes(origin)) return errorResponse(c, "forbidden", "Forbidden origin.");
    // Requests from the web app arrive over the Service Binding with the visitor's IP in an internal header;
    // from the internet, Cloudflare always sets CF-Connecting-IP and that internal header is ignored.
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-client-ip") ?? "internal";
    const { success } = await c.env.RATE_LIMIT_WRITE.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Too many requests. Please wait a minute.", 60);
    await next();
    return;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const res = errorResponse(c, "method_not_allowed", "Method not allowed.");
    res.headers.set("allow", "GET, HEAD, OPTIONS");
    return res;
  }
  await next();
};

/** Read routes accept no query parameters: unknown ones are rejected (security.md §6). */
export const noQueryParams: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (new URL(c.req.url).search.length > 1) {
    return errorResponse(c, "invalid_parameter", "This route does not accept query parameters.");
  }
  await next();
};

/**
 * Per-IP limit (security.md §6). Requests from the web app arrive over the Service Binding, without
 * `CF-Connecting-IP` (Cloudflare always sets it on internet requests), and are not limited.
 */
export const rateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  // From the internet, CF-Connecting-IP arrives. What comes through the web app's /api proxy (D-26) carries
  // the visitor's IP in x-paddock-proxy-ip, which only counts on internal requests.
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-proxy-ip");
  if (ip) {
    const { success } = await c.env.RATE_LIMIT_READ.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Too many requests. Please wait a minute.", 60);
  }
  await next();
};

/** One structured log per request, without IP or headers (security.md §16). */
export const requestLog: MiddlewareHandler<AppEnv> = async (c, next) => {
  const started = Date.now();
  await next();
  console.log(
    JSON.stringify({
      event: "request",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      ms: Date.now() - started,
      country: (c.req.raw.cf as { country?: string } | undefined)?.country ?? null,
      internal: !c.req.header("cf-connecting-ip"),
    }),
  );
};
