import { userFetch } from "@/lib/api";

/** Data export (COM-03): the API generates it and the web app delivers it as a download. */
export async function GET(request: Request) {
  const res = await userFetch("/me/export", { cookie: request.headers.get("cookie") ?? "" });
  if (!res.ok) return new Response(null, { status: res.status === 401 ? 401 : 404 });
  return new Response(res.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="paddock-notes-datos.json"',
      "cache-control": "no-store",
    },
  });
}
