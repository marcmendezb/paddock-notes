import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * `/api/*` served by the web app (D-26). Not used in production: the domain's `paddocknotes.dev/api/*` route
 * goes straight to the API Worker. In preview and locally, the web app and the API live on different hosts
 * and the links in emails (magic link, one-click unsubscribe) point to the web app: this proxy takes them to
 * the API over the Service Binding, with the cookie on the web app's host, as in production.
 *
 * The browser cannot smuggle in internal headers: every incoming `x-paddock-*` and `cf-*` header is dropped,
 * and only the real origin (for the API's CSRF check) and the visitor's IP (limits) are set here.
 */
async function proxy(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase();
    if (lower.startsWith("x-paddock-") || lower.startsWith("cf-") || ["host", "cookie", "origin"].includes(lower)) continue;
    headers.set(name, value);
  }
  const session = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("__Host-pn."))
    .join("; ");
  if (session) headers.set("cookie", session);
  const origin = request.headers.get("origin");
  if (origin) headers.set("x-paddock-origin", origin);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) {
    headers.set("x-paddock-client-ip", ip);
    headers.set("x-paddock-proxy-ip", ip);
  }
  const target = `https://paddock-api.internal${url.pathname}${url.search}`;
  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();
  const res = env.API
    ? await env.API.fetch(new Request(target, init))
    : await fetch(`${process.env.PADDOCK_API_ORIGIN ?? "http://localhost:8787"}${url.pathname}${url.search}`, init);
  return new Response(res.body, res);
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
