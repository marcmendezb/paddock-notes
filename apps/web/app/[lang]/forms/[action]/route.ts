import { NextResponse } from "next/server";
import { isLang } from "@paddock/shared";
import { userFetch } from "@/lib/api";

/**
 * Community forms (phase 4), without JavaScript: POST → API over the Service Binding → redirect
 * (POST/Redirect/GET). CSRF protection: the Origin must be the site's own (security.md §5), and the API
 * checks it again. Only internal return paths are accepted (no open redirects).
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
  /** Where to return if all goes well; by default, the form's page. */
  next?: (f: Field, data: unknown) => string | null;
}

/** An API path segment: identifiers only, never "..", "/" or anything that changes the path. */
const seg = (value: string) => (/^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : "_");

const ACTIONS: Record<string, Action> = {
  /** Magic link (COM-01). The Turnstile widget adds its token to the form (COM-12). */
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
  /** Favourites (COM-10): "fav" checkboxes with "d:driver" or "c:team". */
  favorites: { method: "POST", path: () => "/me", body: (_f, _ctx, all) => ({ favorites: all("fav").slice(0, 20) }) },
  /** Email notifications (COM-11): unchecked boxes do not arrive in the form. */
  notifications: {
    method: "POST",
    path: () => "/me/notifications",
    body: (f) => ({ race: f("race") === "on", analysis: f("analysis") === "on" }),
  },
  /** Newsletter (NUC-10): today it is a demo and the POST does not get here (D-33); kept so it can be turned back on. */
  newsletter: {
    method: "POST",
    path: () => "/newsletter",
    body: (f, { lang }) => ({ email: f("email"), lang, consent: f("consent") === "on" }),
    headers: (f) => ({ "x-captcha-response": f("cf-turnstile-response") }),
  },
  "newsletter-confirm": { method: "POST", path: () => "/newsletter/confirm", body: (f) => ({ token: f("token") }), next: () => "newsletter" },
  unsubscribe: { method: "POST", path: (f) => `/email/unsubscribe/${seg(f("token"))}`, body: () => ({}), next: () => "newsletter" },
};

/** Internal return path: always "/{lang}/…", never an external URL. */
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

  // Demo newsletter (D-33): the form is not read and the API is not called; it returns with the notice.
  if (name === "newsletter") {
    const url = new URL(`/${lang}/newsletter`, origin);
    url.searchParams.set("msg", "newsletter:ok");
    return NextResponse.redirect(url, 303);
  }

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
    // Responses without a JSON body (sign out).
  }
  const ok = res.ok;
  const code = ok ? "ok" : ((data as { error?: { code?: string; message?: string } })?.error?.message ?? "error");
  const target = ok && action.next ? safeBack(lang, action.next(field, data), "account") : back;
  const url = new URL(target, origin);
  url.searchParams.set("msg", ok ? `${name}:ok` : `${name}:${code.split(" ")[0]?.replace(/[^a-z_:.-]/gi, "") || "error"}`);

  const response = NextResponse.redirect(url, 303);
  // The API can set or clear the session cookie (sign out, delete account).
  for (const cookie of res.headers.getSetCookie?.() ?? []) response.headers.append("set-cookie", cookie);
  return response;
}
