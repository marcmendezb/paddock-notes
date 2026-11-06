import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./env";
import { errorResponse } from "./errors";

/** Cabeceras de seguridad de todas las respuestas de la API (seguridad.md §4). */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  // Las respuestas servidas desde la Cache API tienen cabeceras inmutables: se copian.
  c.res = new Response(c.res.body, c.res);
  const h = c.res.headers;
  h.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("x-frame-options", "DENY");
  h.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  // La API pública de lectura se puede consumir desde otros orígenes (D-07).
  h.set("cross-origin-resource-policy", "cross-origin");
};

/** Rutas de comunidad (fase 4): cambian estado, llevan sesión y no se cachean. */
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
 * Baja en un clic (RFC 8058): el proveedor de correo del destinatario hace POST sin Origin ni cookies. El
 * token de la URL es la única credencial y solo permite darse de baja, así que no aplica la comprobación CSRF.
 */
export const isOneClick = (path: string) => under(["/api/v1/email/unsubscribe"], path);

const trusted = (c: { env: AppEnv["Bindings"] }) => c.env.TRUSTED_ORIGINS.split(",");

/**
 * CORS (D-07): lectura pública abierta y sin credenciales; comunidad solo para los orígenes propios,
 * con credenciales.
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
 * Métodos permitidos (seguridad.md §6): la API pública solo lee; las rutas de comunidad admiten además
 * POST y DELETE, con comprobación de Origin (CSRF) y límite de escritura por IP.
 */
export const readOnlyMethods: MiddlewareHandler<AppEnv> = async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (isOneClick(path) && c.req.method === "POST") {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-client-ip") ?? "internal";
    const { success } = await c.env.RATE_LIMIT_WRITE.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Demasiadas peticiones. Espera un minuto.", 60);
    await next();
    return;
  }
  if (isCommunity(path) && ["POST", "DELETE"].includes(c.req.method)) {
    // Desde internet manda el Origin del navegador. Por Service Binding, la web no puede reenviarlo (es una
    // cabecera prohibida en fetch) y envía x-paddock-origin, que solo vale si la petición es interna: desde
    // internet Cloudflare fija siempre CF-Connecting-IP.
    const internal = !c.req.header("cf-connecting-ip");
    const origin = c.req.header("origin") ?? (internal ? c.req.header("x-paddock-origin") : undefined);
    if (!origin || !trusted(c).includes(origin)) return errorResponse(c, "forbidden", "Origen no permitido.");
    // Las peticiones de la web llegan por Service Binding con la IP del visitante en una cabecera interna;
    // desde internet, Cloudflare fija siempre CF-Connecting-IP y esa cabecera interna no se tiene en cuenta.
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-client-ip") ?? "internal";
    const { success } = await c.env.RATE_LIMIT_WRITE.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Demasiadas peticiones. Espera un minuto.", 60);
    await next();
    return;
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const res = errorResponse(c, "method_not_allowed", "Método no permitido.");
    res.headers.set("allow", "GET, HEAD, OPTIONS");
    return res;
  }
  await next();
};

/** Las rutas de lectura no aceptan parámetros de consulta: los desconocidos se rechazan (seguridad.md §6). */
export const noQueryParams: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (new URL(c.req.url).search.length > 1) {
    return errorResponse(c, "invalid_parameter", "Esta ruta no admite parámetros de consulta.");
  }
  await next();
};

/**
 * Límite por IP (seguridad.md §6). Las peticiones de la web llegan por Service Binding, sin
 * `CF-Connecting-IP` (Cloudflare la fija siempre en las peticiones de internet), y no se limitan.
 */
export const rateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const ip = c.req.header("cf-connecting-ip");
  if (ip) {
    const { success } = await c.env.RATE_LIMIT_READ.limit({ key: ip });
    if (!success) return errorResponse(c, "rate_limited", "Demasiadas peticiones. Espera un minuto.", 60);
  }
  await next();
};

/** Un log estructurado por petición, sin IP ni cabeceras (seguridad.md §16). */
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
