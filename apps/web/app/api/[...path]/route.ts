import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * `/api/*` servido por la web (D-26). En producción no se usa: la ruta `paddocknotes.dev/api/*` del dominio
 * lleva directamente al Worker de la API. En la preview y en local, la web y la API viven en hosts distintos
 * y los enlaces de los emails (enlace mágico, baja en un clic) apuntan a la web: este proxy los lleva a la API
 * por Service Binding, con la cookie en el host de la web, como en producción.
 *
 * El navegador no puede colar cabeceras internas: se descartan todas las `x-paddock-*` y `cf-*` que lleguen y
 * solo se fijan aquí el origen real (para la comprobación CSRF de la API) y la IP del visitante (límites).
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
