import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { createF1Writer } from "@paddock/db/f1-write";
import app from "../src/index";

/**
 * Comunidad (fase 4) de punta a punta: enlace mágico, sesión, perfil, predicciones, ligas, CSRF,
 * exportación y borrado. El email se captura con un binding falso y Turnstile se simula.
 */

const ORIGIN = "http://localhost:8789";
const sent: { to: string; text: string }[] = [];
const testEnv = {
  ...env,
  EMAIL: {
    send: async (m: { to: string; text: string }) => {
      sent.push(m);
      return {};
    },
  },
} as unknown as typeof env;

/** IP del visitante que la web reenvía por Service Binding; cada usuario de prueba tiene la suya. */
let ipCounter = 0;
const ipFor = new Map<string, string>();

async function call(path: string, init: RequestInit & { cookie?: string; ip?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  const key = init.ip ?? init.cookie ?? "anon";
  if (!ipFor.has(key)) ipFor.set(key, `198.51.100.${++ipCounter}`);
  if (!headers.has("x-paddock-client-ip")) headers.set("x-paddock-client-ip", ipFor.get(key)!);
  if (init.method && init.method !== "GET" && !headers.has("origin")) headers.set("origin", ORIGIN);
  if (headers.get("origin") === "") headers.delete("origin");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const ctx = createExecutionContext();
  const res = await app.fetch(new Request(`http://localhost:8787/api/v1${path}`, { ...init, headers, redirect: "manual" }), testEnv, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

/** Inicia sesión con el enlace mágico y devuelve la cookie de sesión. */
async function signIn(email: string): Promise<string> {
  const res = await call("/auth/sign-in/magic-link", {
    ip: email,
    method: "POST",
    headers: { "x-captcha-response": "test-token" },
    body: JSON.stringify({ email, callbackURL: `${ORIGIN}/es/account` }),
  });
  expect(res.status, await res.clone().text()).toBe(200);
  const link = sent.at(-1)!.text.match(/https?:\/\/\S+/)![0];
  const verify = await call(link.replace("http://localhost:8787/api/v1", ""), { ip: email });
  expect(verify.status).toBe(302);
  const cookie = verify.headers.getSetCookie().find((c) => c.startsWith("__Host-pn.session_token="))!;
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Secure/i);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).not.toMatch(/Domain=/i);
  return cookie.split(";")[0]!;
}

beforeAll(async () => {
  // Turnstile: siteverify siempre aprueba en los tests.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("challenges.cloudflare.com")) return Response.json({ success: true });
      throw new Error(`fetch inesperado: ${String(input)}`);
    }),
  );
  // Una carrera en el futuro, para que las predicciones estén abiertas pase lo que pase con el reloj.
  const writer = createF1Writer(env.DB);
  await writer.write({
    circuits: [{ id: "test_ring", name: "Test Ring", locality: "Testville", country: "Spain", lat: 40, lng: -3 }],
    drivers: ["ver", "ham", "ant", "rus"].map((id) => ({
      id,
      code: id.toUpperCase(),
      number: null,
      givenName: id,
      familyName: id,
      dateOfBirth: null,
      nationality: null,
    })),
    constructors: [{ id: "team", name: "Team", nationality: null }],
    races: [{ season: 2099, round: 1, name: "Test Grand Prix", circuitId: "test_ring", date: "2099-06-01", startsAt: "2099-06-01T13:00:00.000Z", isSprintWeekend: false }],
    sessions: [
      { season: 2099, round: 1, kind: "qualifying", date: "2099-05-31", startsAt: "2099-05-31T14:00:00.000Z" },
      { season: 2099, round: 1, kind: "race", date: "2099-06-01", startsAt: "2099-06-01T13:00:00.000Z" },
    ],
    driverStandings: ["ver", "ham", "ant", "rus"].map((driverId, i) => ({
      season: 2099,
      round: 0,
      driverId,
      position: i + 1,
      positionText: String(i + 1),
      points: 0,
      wins: 0,
      constructorIds: ["team"],
    })),
  });
});

afterEach(() => {
  sent.length = 0;
});

describe("user accounts (COM-01 to COM-03)", () => {
  it("signs in with magic link without password, session grants profile access", async () => {
    const cookie = await signIn("ana@example.com");
    const me = await call("/me", { cookie });
    expect(me.status).toBe(200);
    expect(me.headers.get("cache-control")).toBe("no-store");
    const body = await me.json<{ data: { email: string; lang: string } }>();
    expect(body.data).toMatchObject({ email: "ana@example.com", lang: "es" });
  });

  it("magic link token is single-use", async () => {
    await call("/auth/sign-in/magic-link", {
      method: "POST",
      headers: { "x-captcha-response": "test-token" },
      body: JSON.stringify({ email: "una@example.com", callbackURL: `${ORIGIN}/es/account` }),
    });
    const link = sent.at(-1)!.text.match(/https?:\/\/\S+/)![0].replace("http://localhost:8787/api/v1", "");
    const first = await call(link);
    const second = await call(link);
    expect(first.headers.getSetCookie().some((c) => c.startsWith("__Host-pn.session_token="))).toBe(true);
    expect(second.headers.getSetCookie().some((c) => c.startsWith("__Host-pn.session_token=") && !c.includes("Max-Age=0"))).toBe(false);
  });

  it("returns 401 without active session", async () => {
    expect((await call("/me")).status).toBe(401);
  });

  it("validates username format and rules (COM-13)", async () => {
    const cookie = await signIn("alias@example.com");
    expect((await call("/me", { method: "POST", cookie, body: JSON.stringify({ name: "Undercut Club" }) })).status).toBe(200);
    expect((await call("/me", { method: "POST", cookie, body: JSON.stringify({ name: "admin oficial" }) })).status).toBe(400);
    expect((await call("/me", { method: "POST", cookie, body: JSON.stringify({ email: "x@y.z" }) })).status).toBe(400);
  });

  it("rejects mutations without trusted origin (CSRF protection)", async () => {
    const cookie = await signIn("csrf@example.com");
    const evil = await call("/me", { method: "POST", cookie, headers: { origin: "https://evil.example" }, body: "{}" });
    expect(evil.status).toBe(403);
  });

  it("internal origin header is rejected for internet requests", async () => {
    const cookie = await signIn("spoof@example.com");
    const internal = await call("/me", {
      method: "POST",
      cookie,
      headers: { origin: "", "x-paddock-origin": ORIGIN },
      body: JSON.stringify({ name: "Interno" }),
    });
    expect(internal.status).toBe(200);
    const external = await call("/me", {
      method: "POST",
      cookie,
      headers: { origin: "", "x-paddock-origin": ORIGIN, "cf-connecting-ip": "203.0.113.50" },
      body: "{}",
    });
    expect(external.status).toBe(403);
  });

  it("exports account data and immediately deletes account", async () => {
    const cookie = await signIn("borrar@example.com");
    const exported = await call("/me/export", { cookie });
    expect(exported.headers.get("content-disposition")).toContain("attachment");
    expect((await exported.json<{ profile: { email: string } }>()).profile.email).toBe("borrar@example.com");
    expect((await call("/me", { method: "DELETE", cookie })).status).toBe(200);
    expect((await call("/me", { cookie })).status).toBe(401);
  });
});

describe("predictions (COM-04 to COM-06)", () => {
  it("saves valid prediction and rejects malformed submissions", async () => {
    const cookie = await signIn("pred@example.com");
    const form = await (await call("/predictions/2099/1", { cookie })).json<{ data: { open: boolean; drivers: unknown[] } }>();
    expect(form.data.open).toBe(true);
    expect(form.data.drivers).toHaveLength(4);
    const ok = await call("/predictions/2099/1", { method: "POST", cookie, body: JSON.stringify({ p1: "ver", p2: "ham", p3: "ant", pole: "ver" }) });
    expect(ok.status).toBe(200);
    const repeated = await call("/predictions/2099/1", { method: "POST", cookie, body: JSON.stringify({ p1: "ver", p2: "ver", p3: "ant", pole: "ver" }) });
    expect(repeated.status).toBe(400);
    const unknown = await call("/predictions/2099/1", { method: "POST", cookie, body: JSON.stringify({ p1: "ver", p2: "ham", p3: "zzz", pole: "ver" }) });
    expect(unknown.status).toBe(400);
    const mine = await (await call("/predictions/2099/me", { cookie })).json<{ data: { round: number; score: unknown }[] }>();
    expect(mine.data).toEqual([expect.objectContaining({ round: 1, score: null })]);
  });

  it("forbids submitting predictions for locked race", async () => {
    const cookie = await signIn("tarde@example.com");
    await createF1Writer(env.DB).write({
      races: [{ season: 2099, round: 2, name: "Past GP", circuitId: "test_ring", date: "2000-01-02", startsAt: "2000-01-02T13:00:00.000Z", isSprintWeekend: false }],
      sessions: [{ season: 2099, round: 2, kind: "qualifying", date: "2000-01-01", startsAt: "2000-01-01T14:00:00.000Z" }],
    });
    const res = await call("/predictions/2099/2", { method: "POST", cookie, body: JSON.stringify({ p1: "ver", p2: "ham", p3: "ant", pole: "ver" }) });
    expect(res.status).toBe(403);
  });
});

describe("private leagues (COM-07, security.md §10)", () => {
  it("only members view league and invite token is visible only to owner", async () => {
    const owner = await signIn("owner@example.com");
    const friend = await signIn("friend@example.com");
    const outsider = await signIn("outsider@example.com");

    const created = await call("/leagues", { method: "POST", cookie: owner, body: JSON.stringify({ name: "Liga del Paddock" }) });
    expect(created.status).toBe(201);
    const { id } = (await created.json<{ data: { id: string } }>()).data;

    const ownerView = await (await call(`/leagues/${id}/2099`, { cookie: owner })).json<{ data: { inviteToken: string } }>();
    expect(ownerView.data.inviteToken).toMatch(/^[a-f0-9]{48}$/);

    expect((await call(`/leagues/${id}/2099`, { cookie: outsider })).status).toBe(404);

    const join = await call("/leagues/join", { method: "POST", cookie: friend, body: JSON.stringify({ token: ownerView.data.inviteToken }) });
    expect(join.status).toBe(200);
    const friendView = await (await call(`/leagues/${id}/2099`, { cookie: friend })).json<{ data: { inviteToken: string | null; ranking: unknown[] } }>();
    expect(friendView.data.inviteToken).toBeNull();
    expect(friendView.data.ranking).toHaveLength(2);

    // Owner revokes invitation: old link becomes invalid.
    await call(`/leagues/${id}/invite`, { method: "POST", cookie: owner });
    const late = await call("/leagues/join", { method: "POST", cookie: outsider, body: JSON.stringify({ token: ownerView.data.inviteToken }) });
    expect(late.status).toBe(404);
  });

  it("latest GP recap: points scored per member and non-participants", async () => {
    const owner = await signIn("recap-owner@example.com");
    const friend = await signIn("recap-friend@example.com");
    const created = await call("/leagues", { method: "POST", cookie: owner, body: JSON.stringify({ name: "Liga Resumen" }) });
    const { id } = (await created.json<{ data: { id: string } }>()).data;
    const view = await (await call(`/leagues/${id}/2099`, { cookie: owner })).json<{ data: { inviteToken: string } }>();
    await call("/leagues/join", { method: "POST", cookie: friend, body: JSON.stringify({ token: view.data.inviteToken }) });
    const pick = await call("/predictions/2099/1", { method: "POST", cookie: friend, body: JSON.stringify({ p1: "ver", p2: "ham", p3: "rus", pole: "ver" }) });
    expect(pick.status).toBe(200);

    // Official result: ver, ham, ant; pole to ver from grid.
    const row = (driver: string, position: number) =>
      env.DB.prepare(
        "insert into results (season, round, kind, driver_id, constructor_id, position, position_text, grid, laps, status, points) values (2099, 1, 'race', ?, 'team', ?, ?, ?, 50, 'Finished', 0)",
      ).bind(driver, position, String(position), position);
    await env.DB.batch([row("ver", 1), row("ham", 2), row("ant", 3)]);
    try {
      const recap = await (await call(`/leagues/${id}/2099`, { cookie: owner })).json<{
        data: { lastRound: { round: number; gp: string; rows: { name: string; points: number | null; exact: number; pole: boolean }[] } };
      }>();
      expect(recap.data.lastRound.round).toBe(1);
      expect(recap.data.lastRound.gp).toBe("Test Grand Prix");
      const [first, second] = recap.data.lastRound.rows;
      // ver and ham in position (5 + 5) plus pole (3); rus off the podium.
      expect(first).toMatchObject({ points: 13, exact: 2, pole: true });
      expect(second).toMatchObject({ points: null });
    } finally {
      await env.DB.prepare("delete from results where season = 2099").run();
    }
  });
});

describe("quiz with authenticated account (COM-08)", () => {
  it("server grades answers and updates streak", async () => {
    const cookie = await signIn("quiz@example.com");
    const res = await call("/quiz-scores", { method: "POST", cookie, body: JSON.stringify({ week: "2099-W01", answers: {} }) });
    expect(res.status).toBe(200);
    expect((await res.json<{ data: { streak: number } }>()).data.streak).toBe(1);
  });
});

describe("mutation rate limiting (security.md §6)", () => {
  it("exceeding 10 mutations per minute from single IP triggers 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await call("/me", { method: "POST", ip: "flood", body: "{}" })).status);
    }
    expect(statuses).toContain(429);
  });
});

describe("newsletter and notifications (NUC-10, CON-06, COM-11, D-16)", () => {
  const subscribe = (email: string, extra: RequestInit = {}) =>
    call("/newsletter", {
      ip: `nl-${email}`,
      method: "POST",
      headers: { "x-captcha-response": "test-token", ...(extra.headers as Record<string, string>) },
      body: JSON.stringify({ email, lang: "es", consent: true }),
    });

  it("double opt-in: signup, single email on retry, confirmation, and one-click unsubscribe", async () => {
    expect((await subscribe("Lector@Example.com")).status).toBe(202);
    expect((await subscribe("lector@example.com")).status).toBe(202);
    expect(sent).toHaveLength(1);
    const link = sent[0]!.text.match(/https?:\/\/\S+confirm\?token=([a-f0-9]{48})/)!;
    expect(link[0]).toContain("/es/newsletter/confirm");

    const row = () => env.DB.prepare("select status, unsubscribe_token as token from newsletter_subscribers where email = 'lector@example.com'").first<{ status: string; token: string }>();
    expect((await row())!.status).toBe("pending");
    const confirm = (token: string) => call("/newsletter/confirm", { ip: "nl-confirm", method: "POST", body: JSON.stringify({ token }) });
    expect((await confirm(link[1]!)).status).toBe(200);
    expect((await row())!.status).toBe("active");
    // Confirmation token is single-use.
    expect((await confirm(link[1]!)).status).toBe(404);

    // Already active: repeating signup sends nothing and leaks no state.
    sent.length = 0;
    expect((await subscribe("lector@example.com")).status).toBe(202);
    expect(sent).toHaveLength(0);

    // RFC 8058: mail provider sends POST without Origin or cookies.
    const { token } = (await row())!;
    const res = await call(`/email/unsubscribe/${token}`, { ip: "mail-provider", method: "POST", headers: { origin: "" }, body: "List-Unsubscribe=One-Click" });
    expect(res.status).toBe(200);
    expect(await row()).toBeNull();
    // Repeating unsubscribe is idempotent.
    expect((await call(`/email/unsubscribe/${token}`, { ip: "mail-provider", method: "POST", headers: { origin: "" } })).status).toBe(200);
  });

  it("signup requires consent, Turnstile, valid email, and trusted origin", async () => {
    const noConsent = await call("/newsletter", { ip: "nl-c", method: "POST", headers: { "x-captcha-response": "t" }, body: JSON.stringify({ email: "x@example.com", lang: "es" }) });
    expect(noConsent.status).toBe(400);
    const noCaptcha = await call("/newsletter", { ip: "nl-x", method: "POST", body: JSON.stringify({ email: "x@example.com", lang: "es", consent: true }) });
    expect(noCaptcha.status).toBe(403);
    expect((await call("/newsletter", { ip: "nl-y", method: "POST", headers: { "x-captcha-response": "t" }, body: JSON.stringify({ email: "no-es-email", lang: "es", consent: true }) })).status).toBe(400);
    expect((await subscribe("z@example.com", { headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("account notifications: enabled, visible in /me, and disabled via unsubscribe link", async () => {
    const cookie = await signIn("avisos@example.com");
    const set = await call("/me/notifications", { cookie, method: "POST", body: JSON.stringify({ race: true, analysis: false }) });
    expect(set.status).toBe(200);
    const me = (await (await call("/me", { cookie })).json()) as { data: { notifications: { race: boolean; analysis: boolean } } };
    expect(me.data.notifications).toEqual({ race: true, analysis: false });

    const user = await env.DB.prepare("select email_token as token from users where email = 'avisos@example.com'").first<{ token: string }>();
    expect(user!.token).toMatch(/^[a-f0-9]{48}$/);
    await call(`/email/unsubscribe/${user!.token}`, { ip: "mail-provider-2", method: "POST", headers: { origin: "" } });
    const after = (await (await call("/me", { cookie })).json()) as { data: { notifications: { race: boolean } } };
    expect(after.data.notifications.race).toBe(false);
    // Unauthenticated requests cannot modify notification preferences.
    expect((await call("/me/notifications", { ip: "anon-n", method: "POST", body: JSON.stringify({ race: true, analysis: true }) })).status).toBe(401);
  });

  it("favorites (COM-10): only drivers (d:) and constructors (c:)", async () => {
    const cookie = await signIn("fav@example.com");
    const ok = await call("/me", { cookie, method: "POST", body: JSON.stringify({ favorites: ["d:ver", "c:team"] }) });
    expect(ok.status).toBe(200);
    const me = (await (await call("/me", { cookie })).json()) as { data: { favorites: string[] } };
    expect(me.data.favorites).toEqual(["d:ver", "c:team"]);
    expect((await call("/me", { cookie, method: "POST", body: JSON.stringify({ favorites: ["ver"] }) })).status).toBe(400);
  });
});
