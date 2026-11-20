import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The hero video with range support (HTTP 206). Workers static assets answer 200 to requests with Range,
 * and Safari on iPhone needs 206 to play an MP4. This route reads the file from
 * the static assets (ASSETS binding), cuts out the requested range and answers 206 with its Content-Range.
 * It only serves the hero videos on the list: no arbitrary paths.
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

  // "bytes=a-b", "bytes=a-" or "bytes=-n" (the last n bytes).
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
