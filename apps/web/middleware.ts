// middleware.ts (runtime edge) en lugar de proxy.ts: OpenNext solo da soporte estable al middleware edge (D-03).
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, type Lang } from "@paddock/shared";

const isDev = process.env.NODE_ENV === "development";

/** Idioma preferido según `Accept-Language` (TRA-11); español por defecto. */
export function preferredLang(header: string | null): Lang {
  if (!header) return DEFAULT_LANG;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? "1");
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.find((x) => isLang(x.lang))?.lang as Lang | undefined ?? DEFAULT_LANG;
}

/**
 * CSP estricta con nonce (seguridad.md §4.1, D-04). En desarrollo, Next.js necesita `unsafe-eval` y
 * estilos en línea para la recarga en caliente; nunca en producción.
 */
export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://cloudflareinsights.com",
    // Turnstile (COM-12): su script se carga con el nonce; el widget vive en un iframe.
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  // Sin prefijo de idioma: redirección interna y relativa al idioma preferido. No hay ningún parámetro
  // que acepte URLs externas (seguridad.md §5).
  if (!isLang(first)) {
    const lang = preferredLang(request.headers.get("accept-language"));
    const target = new URL(`/${lang}${pathname === "/" ? "" : pathname}${search}`, request.url);
    const response = NextResponse.redirect(target, 307);
    response.headers.set("vary", "accept-language");
    return response;
  }

  // Las imágenes para redes no son HTML: sin CSP ni no-store, para que se puedan cachear.
  if (pathname.endsWith("/opengraph-image")) return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Next.js lee el nonce de la cabecera CSP de la petición y lo aplica a sus scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-lang", first);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const reportOnly = process.env.CSP_REPORT_ONLY === "true";
  response.headers.set(reportOnly ? "content-security-policy-report-only" : "content-security-policy", csp);
  response.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  response.headers.set("x-frame-options", "DENY");
  // El HTML lleva un nonce único: nunca se cachea (D-04).
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|brand/|og-fonts/|icon.svg|favicon.ico|robots.txt|sitemap.xml|\\.well-known/).*)"],
};
