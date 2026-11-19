import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Vídeo del hero con soporte de rangos (HTTP 206). Los recursos estáticos de Workers responden 200 a las
 * peticiones con Range, y Safari en iPhone necesita 206 para reproducir un MP4. Esta ruta lee el archivo de
 * los recursos estáticos (binding ASSETS), recorta el tramo pedido y responde 206 con su Content-Range.
 * Solo sirve los vídeos del hero de la lista: nada de rutas arbitrarias.
 */
const FILES = /^hero-v\d+-(480|720)\.mp4$/;
const CACHE = "public, max-age=31536000, immutable";

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FILES.test(file)) return new Response(null, { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  const asset = await env.ASSETS.fetch(new Request(new URL(`/video/${file}`, request.url)));
  if (!asset.ok) return new Response(null, { status: 404 });
  const body = new Uint8Array(await asset.arrayBuffer());
  const size = body.byteLength;
  const headers = {
    "content-type": "video/mp4",
    "accept-ranges": "bytes",
    "cache-control": CACHE,
    "x-content-type-options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range) return new Response(body, { status: 200, headers: { ...headers, "content-length": String(size) } });

  // "bytes=a-b", "bytes=a-" o "bytes=-n" (los últimos n bytes).
  let start = range[1] ? Number(range[1]) : size - Number(range[2] || 0);
  let end = range[1] && range[2] ? Number(range[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } });
  }
  return new Response(body.subarray(start, end + 1), {
    status: 206,
    headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
  });
}
