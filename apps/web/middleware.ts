// middleware.ts (edge runtime) instead of proxy.ts: OpenNext only supports edge middleware as stable (D-03).
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, type Lang } from "@paddock/shared";

const isDev = process.env.NODE_ENV === "development";

/**
 * Language for a request without a language prefix (TRA-11, D-36). The visitor's country decides, via the
 * `cf-ipcountry` header Cloudflare adds: Germany and Switzerland get German, Spain gets Spanish, every
 * other country gets English. Without a usable country (local development, Tor, unknown) the browser's
 * `Accept-Language` decides, and English is the fallback.
 */
const COUNTRY_LANG: Record<string, Lang> = { DE: "de", CH: "de", ES: "es" };

export function preferredLang(country: string | null, acceptLanguage: string | null): Lang {
  const code = country?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") return COUNTRY_LANG[code] ?? "en";
  if (!acceptLanguage) return DEFAULT_LANG;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? "1");
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return (ranked.find((x) => isLang(x.lang))?.lang as Lang | undefined) ?? DEFAULT_LANG;
}

/**
 * Strict CSP with a nonce (security.md §4.1, D-04). In development, Next.js needs `unsafe-eval` and inline
 * styles for hot reload; never in production.
 */
export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data:",
    // The hero's background video, served from the site itself.
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self' https://cloudflareinsights.com",
    // Turnstile (COM-12): its script loads with the nonce; the widget lives in an iframe.
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

  // No language prefix: an internal redirect, relative, to the preferred language. No parameter accepts
  // external URLs (security.md §5).
  if (!isLang(first)) {
    const lang = preferredLang(request.headers.get("cf-ipcountry"), request.headers.get("accept-language"));
    const target = new URL(`/${lang}${pathname === "/" ? "" : pathname}${search}`, request.url);
    const response = NextResponse.redirect(target, 307);
    response.headers.set("vary", "cf-ipcountry, accept-language");
    return response;
  }

  // Social images are not HTML: no CSP and no no-store, so they can be cached.
  if (pathname.endsWith("/opengraph-image")) return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Next.js reads the nonce from the request's CSP header and applies it to its scripts.
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
  // The HTML carries a unique nonce: it is never cached (D-04).
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  // `api/`: the proxy to the API (D-26), without the language redirect or the page CSP.
  matcher: ["/((?!_next/static|_next/image|api/|fonts/|brand/|og-fonts/|video/|media/|icon.svg|favicon.ico|robots.txt|sitemap.xml|\\.well-known/).*)"],
};
