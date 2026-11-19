import { NextResponse } from "next/server";
import { isLang } from "@paddock/shared";
import { userFetch } from "@/lib/api";

/**
 * Formularios de la comunidad (fase 4), sin JavaScript: POST → API por Service Binding → redirección
 * (POST/Redirect/GET). Protección CSRF: el Origin debe ser el del propio sitio (seguridad.md §5), y la API
 * vuelve a comprobarlo. Solo se aceptan rutas de vuelta internas (sin redirecciones abiertas).
 */

type Field = (name: string) => string;
type All = (name: string) => string[];

interface Ctx {
  origin: string;
  lang: string;
}

interface Action {
  method: "POST" | "DELETE";
  path: (f: Field) => string;
  body?: (f: Field, ctx: Ctx, all: All) => unknown;
  headers?: (f: Field) => Record<string, string>;
  /** A dónde volver si todo va bien; por defecto, a la página del formulario. */
  next?: (f: Field, data: unknown) => string | null;
}

/** Segmento de ruta de la API: solo identificadores, nunca "..", "/" ni nada que cambie la ruta. */
const seg = (value: string) => (/^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : "_");

const ACTIONS: Record<string, Action> = {
  /** Enlace mágico (COM-01). El widget de Turnstile añade su token al formulario (COM-12). */
  "magic-link": {
    method: "POST",
    path: () => "/auth/sign-in/magic-link",
    body: (f, { origin, lang }) => ({ email: f("email"), callbackURL: `${origin}/${lang}/account` }),
    headers: (f) => ({ "x-captcha-response": f("cf-turnstile-response") }),
  },
  "sign-out": { method: "POST", path: () => "/auth/sign-out", body: () => ({}) },
  profile: {
    method: "POST",
    path: () => "/me",
    body: (f) => ({ name: f("name"), lang: f("lang") }),
  },
  "delete-account": { method: "DELETE", path: () => "/me" },
  prediction: {
    method: "POST",
    path: (f) => `/predictions/${seg(f("season"))}/${seg(f("round"))}`,
    body: (f) => ({ p1: f("p1"), p2: f("p2"), p3: f("p3"), pole: f("pole") }),
  },
  "league-create": {
    method: "POST",
    path: () => "/leagues",
    body: (f) => ({ name: f("name") }),
    next: (_, data) => `leagues/${(data as { data: { id: string } }).data.id}`,
  },
  "league-join": {
    method: "POST",
    path: () => "/leagues/join",
    body: (f) => ({ token: f("token") }),
    next: (_, data) => `leagues/${(data as { data: { id: string } }).data.id}`,
  },
  "league-invite": { method: "POST", path: (f) => `/leagues/${seg(f("id"))}/invite`, body: () => ({}) },
  "league-leave": { method: "POST", path: (f) => `/leagues/${seg(f("id"))}/leave`, body: () => ({}), next: () => "account" },
  "quiz-score": {
    method: "POST",
    path: () => "/quiz-scores",
    body: (f) => ({
      week: f("week"),
      answers: Object.fromEntries(["q1", "q2", "q3", "q4", "q5"].map((q) => [q, f(q)]).filter(([, v]) => v)),
    }),
  },
  report: { method: "POST", path: () => "/reports", body: (f) => ({ kind: f("kind"), targetId: f("target") }) },
  /** Favoritos (COM-10): casillas "fav" con "d:piloto" o "c:equipo". */
  favorites: { method: "POST", path: () => "/me", body: (_f, _ctx, all) => ({ favorites: all("fav").slice(0, 20) }) },
  /** Avisos por email (COM-11): casillas sin marcar no llegan en el formulario. */
  notifications: {
    method: "POST",
    path: () => "/me/notifications",
    body: (f) => ({ race: f("race") === "on", analysis: f("analysis") === "on" }),
  },
  /** Newsletter (NUC-10): alta con consentimiento y Turnstile; la API manda el email de confirmación. */
  newsletter: {
    method: "POST",
    path: () => "/newsletter",
    body: (f, { lang }) => ({ email: f("email"), lang, consent: f("consent") === "on" }),
    headers: (f) => ({ "x-captcha-response": f("cf-turnstile-response") }),
  },
  "newsletter-confirm": { method: "POST", path: () => "/newsletter/confirm", body: (f) => ({ token: f("token") }), next: () => "newsletter" },
  unsubscribe: { method: "POST", path: (f) => `/email/unsubscribe/${seg(f("token"))}`, body: () => ({}), next: () => "newsletter" },
};

/** Ruta interna de vuelta: siempre "/{lang}/…", nunca una URL externa. */
function safeBack(lang: string, value: string | null, fallback: string): string {
  if (value && /^[a-z0-9/_?=&.-]{0,200}$/i.test(value) && !value.includes("//") && !value.startsWith("/")) {
    return `/${lang}/${value}`;
  }
  return `/${lang}/${fallback}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ lang: string; action: string }> }) {
  const { lang, action: name } = await params;
  const action = ACTIONS[name];
  const origin = new URL(request.url).origin;
  if (!isLang(lang) || !action) return new NextResponse(null, { status: 404 });
  if (request.headers.get("origin") !== origin) return new NextResponse("Forbidden", { status: 403 });

  const form = await request.formData();
  const field: Field = (key) => {
    const v = form.get(key);
    return typeof v === "string" ? v.slice(0, 200) : "";
  };
  const all: All = (key) => form.getAll(key).filter((v): v is string => typeof v === "string").map((v) => v.slice(0, 80));
  const back = safeBack(lang, field("back") || null, "account");

  const res = await userFetch(action.path(field), {
    cookie: request.headers.get("cookie") ?? "",
    method: action.method,
    body: action.body?.(field, { origin, lang }, all),
    extraHeaders: action.headers?.(field),
    clientIp: request.headers.get("cf-connecting-ip"),
    origin,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Respuestas sin cuerpo JSON (cerrar sesión).
  }
  const ok = res.ok;
  const code = ok ? "ok" : ((data as { error?: { code?: string; message?: string } })?.error?.message ?? "error");
  const target = ok && action.next ? safeBack(lang, action.next(field, data), "account") : back;
  const url = new URL(target, origin);
  url.searchParams.set("msg", ok ? `${name}:ok` : `${name}:${code.split(" ")[0]?.replace(/[^a-z_:.-]/gi, "") || "error"}`);

  const response = NextResponse.redirect(url, 303);
  // La API puede fijar o borrar la cookie de sesión (cerrar sesión, borrar cuenta).
  for (const cookie of res.headers.getSetCookie?.() ?? []) response.headers.append("set-cookie", cookie);
  return response;
}
