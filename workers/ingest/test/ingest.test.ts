import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env, exports } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { ANALYSIS_VERSION } from "@paddock/analysis";
import schedule2026 from "../../../fixtures/jolpica/2026-races.json";
import results2026r1 from "../../../fixtures/jolpica/2026-1-results.json";
import driverStandings from "../../../fixtures/jolpica/2026-driverstandings.json";
import constructorStandings from "../../../fixtures/jolpica/2026-constructorstandings.json";
import quali2026 from "../../../fixtures/jolpica/2026-19-qualifying.json";
import pits2026 from "../../../fixtures/jolpica/2026-19-pitstops.json";
import { fetchJson, LiveSessionError, OutboundError } from "../src/http";
import { jolpicaContext } from "../src/jolpica";
import type { OutboundLimiter } from "../src/limiter";
import { runTask } from "../src/tasks";
import { advanceBackfill } from "../src/backfill";
import { advanceAnalysis } from "../src/post-race";
import { GRACE_MS, INACTIVE_AFTER_MS, purgeInactiveAccounts } from "../src/retention";
import { composeDigest, notifyAnalysis, render, scheduleNewsletter, scheduleRaceNotice } from "../src/mailing";
import { scheduleResponseSchema } from "@paddock/shared/jolpica";

const emptyRaces = { MRData: { limit: "100", offset: "0", total: "0", RaceTable: { Races: [] } } };

function mockJolpica(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const responses: Record<string, unknown> = {
    "2026/races": schedule2026,
    "2026/1/results": results2026r1,
    "2026/1/driverstandings": driverStandings,
    "2026/1/constructorstandings": constructorStandings,
    "2026/1/qualifying": quali2026,
    "2026/1/pitstops": pits2026,
    ...overrides,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      expect(new Headers(init?.headers).get("user-agent")).toMatch(/^PaddockNotes\//);
      const key = url.pathname.replace("/ergast/f1/", "").replace(/\/$/, "");
      return Response.json(responses[key] ?? emptyRaces);
    }),
  );
  return calls;
}

const TABLES = [
  "newsletter_subscribers",
  "auth_sessions",
  "users",
  "analysis_artifacts",
  "laps",
  "pit_stops",
  "qualifying",
  "ingest_runs",
  "ingest_state",
  "standings_constructors",
  "standings_drivers",
  "results",
  "sessions",
  "races",
  "circuits",
  "drivers",
  "constructors",
];

beforeEach(async () => {
  await env.DB.batch(TABLES.map((t) => env.DB.prepare(`delete from ${t}`)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tarea diaria de calendario", () => {
  it("carga el calendario y los resultados de las rondas disputadas que faltan", async () => {
    const calls = mockJolpica();
    const now = Date.parse("2026-03-10T12:00:00Z");
    const outcome = await runTask(env, "schedule", now);
    expect(outcome).toMatchObject({ status: "ok", requests: 6 });
    expect(calls).toEqual([
      "/ergast/f1/2026/races/",
      "/ergast/f1/2026/1/results/",
      "/ergast/f1/2026/1/qualifying/",
      "/ergast/f1/2026/1/pitstops/",
      "/ergast/f1/2026/1/driverstandings/",
      "/ergast/f1/2026/1/constructorstandings/",
    ]);
    // Los fixtures de Q1–Q3 y paradas son de la ronda 19: se guardan con la ronda que se pide.
    const quali = await env.DB.prepare("select count(*) as n from qualifying where round = 1").first<{ n: number }>();
    expect(quali?.n).toBe(22);

    const reader = createF1Reader(env.DB);
    const schedule = await reader.getSchedule(2026, now);
    expect(schedule).toHaveLength(23);
    expect(schedule[0]).toMatchObject({ status: "completed", winner: { id: "russell" } });
    expect(schedule[1]).toMatchObject({ status: "next", isSprintWeekend: true });

    const next = await reader.getNextRace(now);
    expect(next?.round).toBe(2);
    expect(next?.sessions.map((s) => s.kind)).toEqual(["fp1", "sprint_qualifying", "sprint", "qualifying", "race"]);

    const standings = await reader.getDriverStandings(2026);
    expect(standings?.rows[0]).toMatchObject({ driver: { id: "antonelli" }, points: 380, gapToLeader: 0 });
    expect(await reader.updatedAt(["schedule:2026"])).toBe("2026-03-10T12:00:00.000Z");

    const run = await env.DB.prepare("select task, status, requests from ingest_runs").first();
    expect(run).toEqual({ task: "schedule", status: "ok", requests: 6 });
  });

  it("desde octubre carga también el calendario de la temporada siguiente (NUC-07)", async () => {
    const calls = mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T12:00:00Z"));
    expect(calls.some((c) => c.includes("/2027/races"))).toBe(false);
    await runTask(env, "schedule", Date.parse("2026-10-15T04:00:00Z"));
    expect(calls.some((c) => c.includes("/2027/races"))).toBe(true);
  });

  it("es idempotente: repetir la tarea no duplica filas", async () => {
    mockJolpica();
    const now = Date.parse("2026-03-10T12:00:00Z");
    await runTask(env, "schedule", now);
    await runTask(env, "schedule", now + 1000);
    const { n } = (await env.DB.prepare("select count(*) as n from results").first<{ n: number }>())!;
    expect(n).toBe(22);
  });
});

describe("cron de 15 minutos", () => {
  it("no hace nada si no hay carreras cerca", async () => {
    const calls = mockJolpica();
    expect(await runTask(env, "recent", Date.parse("2026-03-10T12:00:00Z"))).toEqual({ status: "skipped" });
    expect(calls).toHaveLength(0);
  });

  it("reingesta la carrera que acaba de terminar", async () => {
    mockJolpica({ "2026/1/results": emptyRaces });
    await runTask(env, "schedule", Date.parse("2026-03-07T00:00:00Z"));
    const calls = mockJolpica();
    const outcome = await runTask(env, "recent", Date.parse("2026-03-08T07:00:00Z"));
    expect(outcome.status).toBe("ok");
    expect(calls).toContain("/ergast/f1/2026/1/results/");
    expect(calls).toContain("/ergast/f1/2026/1/laps/");
  });
});

describe("cuarentena", () => {
  it("no sobrescribe un resultado consolidado que cambia demasiado", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T12:00:00Z"));

    const tampered = JSON.parse(JSON.stringify(results2026r1)) as typeof results2026r1;
    for (const r of tampered.MRData.RaceTable.Races[0]!.Results.slice(0, 5)) r.status = "Disqualified";
    mockJolpica({ "2026/1/results": tampered });
    const outcome = await runTask(env, "corrections", Date.parse("2026-05-01T05:00:00Z"));
    expect(outcome.status).toBe("quarantined");

    const winner = await env.DB.prepare("select status from results where round = 1 and position = 1").first();
    expect(winner).toEqual({ status: "Finished" });
  });
});

describe("salida a internet", () => {
  it("rechaza hosts fuera de la lista", async () => {
    await expect(fetchJson(jolpicaContext(env), "https://evil.example/x", scheduleResponseSchema)).rejects.toThrow(
      OutboundError,
    );
  });

  it("un 401 de OpenF1 por sesión en directo se aplaza; otro 401 es un error (D-25)", async () => {
    const live = { detail: "Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends." };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(live, { status: 401 })));
    const ctx = { ...jolpicaContext(env), env: { ...env, OPENF1_MAX_PER_SECOND: "50" } };
    await expect(fetchJson(ctx, "https://api.openf1.org/v1/sessions?year=2026", scheduleResponseSchema)).rejects.toBeInstanceOf(LiveSessionError);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ detail: "bad key" }, { status: 401 })));
    const err = await fetchJson(jolpicaContext(env), "https://api.jolpi.ca/ergast/f1/2026/races/", scheduleResponseSchema).catch((e) => e);
    expect(err).toBeInstanceOf(OutboundError);
    expect(err).not.toBeInstanceOf(LiveSessionError);
  });

  it("rechaza respuestas que no cumplen el esquema", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ hola: "mundo" })));
    await expect(
      fetchJson(jolpicaContext(env), "https://api.jolpi.ca/ergast/f1/2026/races/", scheduleResponseSchema),
    ).rejects.toThrow();
  });
});

describe("limitador", () => {
  const policy = { perSecond: 3, perWindow: 5, windowMs: 3_600_000 };

  it("respeta el límite por segundo y por ventana", async () => {
    const stub = env.OUTBOUND_LIMITER.get(env.OUTBOUND_LIMITER.idFromName("test-host"));
    await runInDurableObject(stub, async (limiter: OutboundLimiter) => {
      const t = 1_000_000;
      expect((await limiter.acquire(policy, t)).waitMs).toBe(0);
      expect((await limiter.acquire(policy, t)).waitMs).toBe(0);
      expect((await limiter.acquire(policy, t)).waitMs).toBe(0);
      expect((await limiter.acquire(policy, t)).waitMs).toBe(1000);
      expect((await limiter.acquire(policy, t + 1000)).waitMs).toBe(0);
      expect((await limiter.acquire(policy, t + 1001)).waitMs).toBe(0);
      expect((await limiter.acquire(policy, t + 2000)).waitMs).toBe(3_600_000 - 2000);
    });
  });

  it("deja de llamar a la fuente tras un 429", async () => {
    const stub = env.OUTBOUND_LIMITER.get(env.OUTBOUND_LIMITER.idFromName("penalized-host"));
    await runInDurableObject(stub, async (limiter: OutboundLimiter) => {
      await limiter.penalize(60_000, 5_000);
      expect((await limiter.acquire(policy, 6_000)).waitMs).toBe(59_000);
    });
  });
});

describe("entrada HTTP", () => {
  it("responde 404 a cualquier petición", async () => {
    const response = await exports.default.fetch("https://paddock-ingest/anything");
    expect(response.status).toBe(404);
  });
});

describe("carga del histórico (D-11)", () => {
  function fakeBackfill(statuses: Record<string, string> = {}) {
    const created: { id: string; params: { season: number } }[] = [];
    const binding = {
      create: async (opts: { id: string; params: { season: number } }) => {
        created.push(opts);
        return { id: opts.id };
      },
      get: async (id: string) => ({
        status: async () => ({ status: statuses[id] ?? "running" }),
        terminate: async () => {
          statuses[id] = "terminated";
        },
      }),
    };
    return { created, testEnv: { ...env, BACKFILL: binding } as unknown as typeof env };
  }

  it("empieza por la temporada en curso y retrocede de una en una", async () => {
    const { created, testEnv } = fakeBackfill();
    const now = Date.parse("2026-11-06T00:00:00Z");
    expect(await advanceBackfill(testEnv, now)).toMatch(/^creada: backfill-2026-/);
    expect(await advanceBackfill(testEnv, now + 1)).toMatch(/^activa:/);
    expect(created.map((c) => c.params.season)).toEqual([2026]);
  });

  it("pasa a la temporada anterior cuando la instancia termina", async () => {
    const statuses: Record<string, string> = {};
    const { created, testEnv } = fakeBackfill(statuses);
    const now = Date.parse("2026-11-06T00:00:00Z");
    await advanceBackfill(testEnv, now);
    statuses[created[0]!.id] = "complete";
    await advanceBackfill(testEnv, now + 1);
    expect(created.map((c) => c.params.season)).toEqual([2026, 2025]);
  });

  it("reintenta la misma temporada si la instancia falla", async () => {
    const statuses: Record<string, string> = {};
    const { created, testEnv } = fakeBackfill(statuses);
    const now = Date.parse("2026-11-06T00:00:00Z");
    await advanceBackfill(testEnv, now);
    statuses[created[0]!.id] = "errored";
    expect(await advanceBackfill(testEnv, now + 1)).toMatch(/^reintentada: backfill-2026-/);
    expect(created.map((c) => c.params.season)).toEqual([2026, 2026]);
  });

  it("termina y recrea una instancia atascada más de 12 horas", async () => {
    const statuses: Record<string, string> = {};
    const { created, testEnv } = fakeBackfill(statuses);
    const now = Date.parse("2026-11-06T00:00:00Z");
    await advanceBackfill(testEnv, now);
    expect(await advanceBackfill(testEnv, now + 11 * 3_600_000)).toMatch(/^activa:/);
    expect(await advanceBackfill(testEnv, now + 13 * 3_600_000)).toMatch(/^reintentada: backfill-2026-/);
    expect(statuses[created[0]!.id]).toBe("terminated");
    expect(created.map((c) => c.params.season)).toEqual([2026, 2026]);
  });

  it("termina tras 1950", async () => {
    const { created, testEnv } = fakeBackfill();
    await env.DB.prepare("insert into ingest_state (resource, updated_at) values ('backfill:cursor', '1949')").run();
    expect(await advanceBackfill(testEnv)).toBe("completa");
    expect(created).toHaveLength(0);
  });
});

describe("análisis tras la carrera (D-08)", () => {
  function fakePostRace(statuses: Record<string, string> = {}) {
    const created: { id: string; params: { season: number; round: number } }[] = [];
    const binding = {
      create: async (opts: { id: string; params: { season: number; round: number } }) => {
        created.push(opts);
        return { id: opts.id };
      },
      get: async (id: string) => ({ status: async () => ({ status: statuses[id] ?? "running" }) }),
    };
    return { created, testEnv: { ...env, POST_RACE: binding } as unknown as typeof env };
  }

  it("analiza la carrera más reciente sin análisis y marca las que fallan", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T12:00:00Z"));
    const statuses: Record<string, string> = {};
    const { created, testEnv } = fakePostRace(statuses);
    const now = Date.parse("2026-03-10T12:00:00Z");
    expect(await advanceAnalysis(testEnv, now)).toMatch(/^creada: postrace-2026-1-/);
    expect(await advanceAnalysis(testEnv, now + 1)).toMatch(/^activa:/);
    statuses[created[0]!.id] = "errored";
    expect(await advanceAnalysis(testEnv, now + 2)).toBe("al día");
    expect(created).toHaveLength(1);
  });

  it("vuelve a analizar las carreras con una versión anterior del análisis", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T12:00:00Z"));
    const writer = createF1Writer(env.DB);
    const row = { season: 2026, round: 1, sessionKey: 1, tools: ["strategy"], telemetryDrivers: [], weather: null, createdAt: "2026-03-08T10:00:00Z" };
    await writer.saveAnalysis({ ...row, version: ANALYSIS_VERSION });
    expect(await advanceAnalysis(fakePostRace().testEnv, Date.parse("2026-03-10T12:00:00Z"))).toBe("al día");
    await writer.saveAnalysis({ ...row, version: ANALYSIS_VERSION - 1 });
    expect(await advanceAnalysis(fakePostRace().testEnv, Date.parse("2026-03-10T12:00:00Z"))).toMatch(/^creada: postrace-2026-1-/);
  });

  it("no empieza un análisis durante una sesión en directo (D-25)", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T12:00:00Z"));
    const { created, testEnv } = fakePostRace();
    // Libres 1 de China: 13 de marzo a las 03:30 UTC.
    expect(await advanceAnalysis(testEnv, Date.parse("2026-03-13T04:00:00Z"))).toBe("aplazada: sesión en directo");
    expect(created).toHaveLength(0);
    expect(await advanceAnalysis(testEnv, Date.parse("2026-03-13T12:00:00Z"))).toMatch(/^creada:/);
  });

  it("espera unas horas tras la carrera antes de pedir los datos", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-08T07:00:00Z"));
    const { created, testEnv } = fakePostRace();
    expect(await advanceAnalysis(testEnv, Date.parse("2026-03-08T07:00:00Z"))).toBe("al día");
    expect(created).toHaveLength(0);
  });
});

describe("retención de cuentas inactivas (seguridad.md §17)", () => {
  it("avisa, espera 30 días y borra; volver a entrar anula el aviso", async () => {
    const sent: { to: string; subject: string }[] = [];
    const testEnv = { ...env, EMAIL: { send: async (m: { to: string; subject: string }) => void sent.push(m) } } as unknown as typeof env;
    const now = Date.parse("2028-12-01T00:00:00Z");
    const old = now - INACTIVE_AFTER_MS - 86_400_000;
    await env.DB.batch([
      env.DB.prepare("insert into users (id, name, email, lang, favorites, created_at, updated_at) values ('a', 'Ana', 'ana@example.com', 'es', '[]', ?, ?)").bind(old, old),
      env.DB.prepare("insert into users (id, name, email, lang, favorites, created_at, updated_at) values ('b', 'Bea', 'bea@example.com', 'en', '[]', ?, ?)").bind(now, now),
    ]);

    expect(await purgeInactiveAccounts(testEnv, now)).toEqual({ warned: 1, deleted: 0 });
    expect(sent.map((m) => m.to)).toEqual(["ana@example.com"]);

    // A los 10 días: ni otro aviso ni borrado.
    expect(await purgeInactiveAccounts(testEnv, now + 10 * 86_400_000)).toEqual({ warned: 0, deleted: 0 });
    // Pasado el plazo: se borra.
    expect(await purgeInactiveAccounts(testEnv, now + GRACE_MS + 86_400_000)).toEqual({ warned: 0, deleted: 1 });
    const left = await env.DB.prepare("select id from users").all();
    expect(left.results.map((r) => r.id)).toEqual(["b"]);
  });

  it("si el usuario vuelve tras el aviso, no se borra", async () => {
    const testEnv = { ...env, EMAIL: { send: async () => undefined } } as unknown as typeof env;
    const now = Date.parse("2028-12-01T00:00:00Z");
    const old = now - INACTIVE_AFTER_MS - 86_400_000;
    await env.DB.prepare("insert into users (id, name, email, lang, favorites, created_at, updated_at) values ('c', 'Carla', 'c@example.com', 'es', '[]', ?, ?)").bind(old, old).run();
    expect(await purgeInactiveAccounts(testEnv, now)).toEqual({ warned: 1, deleted: 0 });
    // Entra a los 5 días: la sesión renovada es actividad posterior al aviso.
    await env.DB.prepare("insert into auth_sessions (id, user_id, token, expires_at, created_at, updated_at) values ('s', 'c', 't', ?, ?, ?)")
      .bind(now + 40 * 86_400_000, now + 5 * 86_400_000, now + 5 * 86_400_000).run();
    expect(await purgeInactiveAccounts(testEnv, now + GRACE_MS + 86_400_000)).toEqual({ warned: 0, deleted: 0 });
    expect((await env.DB.prepare("select id from users").all()).results).toHaveLength(1);
  });
});

describe("envíos (CON-06, COM-11, D-16)", () => {
  function withMailing() {
    const created: { id: string; params: unknown }[] = [];
    const testEnv = { ...env, MAILING: { create: async (o: { id: string; params: unknown }) => void created.push(o) } } as unknown as typeof env;
    return { testEnv, created };
  }

  it("la newsletter del martes sale una sola vez, con la carrera, el próximo GP y un explicador", async () => {
    mockJolpica();
    const tuesday = Date.parse("2026-03-10T08:00:00Z");
    await runTask(env, "schedule", tuesday);
    const { testEnv, created } = withMailing();
    expect(await scheduleNewsletter(testEnv, tuesday)).toBe("creado: newsletter-2026-1");
    expect(await scheduleNewsletter(testEnv, tuesday + 60_000)).toBe("ya enviado: newsletter-2026-1");
    expect(created.map((c) => c.id)).toEqual(["newsletter-2026-1"]);
    // Una semana después ya no toca.
    expect(await scheduleNewsletter(testEnv, tuesday + 8 * 86_400_000)).toMatch(/sin carrera/);

    const digest = (await composeDigest(env, 2026, 1, tuesday))!;
    expect(digest.podium).toHaveLength(3);
    expect(digest.next).toMatchObject({ round: 2, gp: "Chinese Grand Prix", circuitId: "shanghai" });

    const to = { id: "x", email: "a@example.com", lang: "es", token: "a".repeat(48) };
    const email = render(env, { kind: "newsletter", digest }, to);
    expect(email.subject).toMatch(/^.+ gana el Gran Premio de Australia$/);
    expect(email.text).toContain("LA CARRERA EN 5 LÍNEAS");
    expect(email.text).toContain("PRÓXIMA CITA\nGran Premio de China");
    expect(email.text).toContain("PARA ENTENDER\nEl formato sprint. Este fin de semana hay sprint.");
    expect(email.text).toContain(`/es/newsletter/unsubscribe?token=${to.token}`);
    expect(email.text).toContain("no oficial");
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<https://paddocknotes.dev/api/v1/email/unsubscribe/${to.token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    const en = render(env, { kind: "newsletter", digest }, { ...to, lang: "en" });
    expect(en.subject).toMatch(/ wins the Australian Grand Prix$/);
  });

  it("aviso de GP: solo cuando la primera sesión empieza en las próximas 48 h", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T04:00:00Z"));
    const { testEnv, created } = withMailing();
    expect(await scheduleRaceNotice(testEnv, Date.parse("2026-03-10T04:00:00Z"))).toBe("sin GP en 48 h");
    expect(await scheduleRaceNotice(testEnv, Date.parse("2026-03-12T04:00:00Z"))).toBe("creado: race-2026-2");
    expect(created).toEqual([{ id: "race-2026-2", params: { kind: "race", season: 2026, round: 2 } }]);
  });

  it("aviso de análisis: no para carreras antiguas analizadas al cargar el histórico", async () => {
    mockJolpica();
    await runTask(env, "schedule", Date.parse("2026-03-10T04:00:00Z"));
    const { testEnv, created } = withMailing();
    expect(await notifyAnalysis(testEnv, 2026, 1, Date.parse("2026-06-01T00:00:00Z"))).toMatch(/antigua/);
    expect(await notifyAnalysis(testEnv, 2026, 1, Date.parse("2026-03-08T09:00:00Z"))).toBe("creado: analysis-2026-1");
    expect(created).toHaveLength(1);
  });
});
