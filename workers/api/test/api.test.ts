import { beforeAll, describe, expect, it } from "vitest";
import { env, exports } from "cloudflare:workers";
// En los tests sí se puede escribir: la regla D-14 solo afecta al código de src/.
import { createF1Writer } from "@paddock/db/f1-write";
import {
  constructorStandingsResponseSchema,
  driverStandingsResponseSchema,
  normalizeConstructorStandings,
  normalizeDriverStandings,
  normalizePitStops,
  normalizeQualifying,
  normalizeResults,
  normalizeSchedule,
  resultsResponseSchema,
  scheduleResponseSchema,
} from "@paddock/shared/jolpica";
import schedule2026 from "../../../fixtures/jolpica/2026-races.json";
import results2026r1 from "../../../fixtures/jolpica/2026-1-results.json";
import driverStandings from "../../../fixtures/jolpica/2026-driverstandings.json";
import constructorStandings from "../../../fixtures/jolpica/2026-constructorstandings.json";
import quali from "../../../fixtures/jolpica/2026-19-qualifying.json";
import pits from "../../../fixtures/jolpica/2026-19-pitstops.json";

const api = (path: string, init?: RequestInit) => exports.default.fetch(`https://paddocknotes.dev/api/v1${path}`, init);

beforeAll(async () => {
  const writer = createF1Writer(env.DB);
  const schedule = normalizeSchedule(scheduleResponseSchema.parse(schedule2026).MRData.RaceTable.Races);
  const results = normalizeResults(resultsResponseSchema.parse(results2026r1).MRData.RaceTable.Races);
  const d = driverStandingsResponseSchema.parse(driverStandings).MRData.StandingsTable.StandingsLists[0]!;
  const c = constructorStandingsResponseSchema.parse(constructorStandings).MRData.StandingsTable.StandingsLists[0]!;
  const ds = normalizeDriverStandings(d.season, d.round, d.DriverStandings);
  const cs = normalizeConstructorStandings(c.season, c.round, c.ConstructorStandings);
  await writer.write(
    {
      ...schedule,
      drivers: [...results.drivers, ...ds.drivers],
      constructors: [...results.constructors, ...ds.constructors, ...cs.constructors],
      results: results.results,
      driverStandings: ds.standings,
      constructorStandings: cs.standings,
      resources: ["schedule:2026", "results:2026:1", "standings:2026"],
    },
    new Date("2026-11-01T04:00:00Z"),
  );
  // Q1–Q3 y paradas reales de la ronda 19, guardadas como ronda 1 para tener una ronda completa.
  const q = normalizeQualifying(2026, 1, resultsResponseSchema.parse(quali).MRData.RaceTable.Races[0]!.QualifyingResults!);
  const p = normalizePitStops(2026, 1, resultsResponseSchema.parse(pits).MRData.RaceTable.Races[0]!.PitStops!);
  await writer.write({ drivers: q.drivers, constructors: q.constructors, qualifying: q.qualifying, pitStops: p });
});

describe("contrato de respuesta", () => {
  it("devuelve el calendario con fuente, licencia y fecha de actualización", async () => {
    const res = await api("/seasons/2026/schedule");
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { round: number; status: string }[]; source: string[]; license: string; updated_at: string }>();
    expect(body.source).toEqual(["Jolpica F1"]);
    expect(body.license).toBe("CC BY-NC-SA 4.0");
    expect(body.updated_at).toBe("2026-11-01T04:00:00.000Z");
    expect(body.data).toHaveLength(23);
    expect(body.data[0]).toMatchObject({ round: 1, status: "completed", winner: { id: "russell" } });
  });

  it("marca como antiguo un calendario con resultados retrasados", async () => {
    // Las rondas 2 a 19 ya se han disputado y no tienen resultado en los datos de prueba.
    const res = await api("/seasons/2026/schedule");
    expect(res.headers.get("x-data-stale")).toBe("true");
  });

  it("acepta `current`", async () => {
    const res = await api("/seasons/current/standings/drivers");
    expect(res.status).toBe(200);
    const body = await res.json<{ data: { round: number; rows: { driver: { id: string }; podiums: number }[] } }>();
    expect(body.data.round).toBe(19);
    expect(body.data.rows[0]!.driver.id).toBe("antonelli");
    expect(body.data.rows.find((r) => r.driver.id === "russell")?.podiums).toBe(1);
  });

  it("devuelve una carrera con sus sesiones y resultado", async () => {
    const res = await api("/seasons/2026/races/1");
    const body = await res.json<{ data: { results: { position: number | null; positionsGained: number | null }[]; sessions: unknown[] } }>();
    expect(body.data.results).toHaveLength(22);
    expect(body.data.results[0]).toMatchObject({ position: 1, positionsGained: 0 });
    expect(body.data.sessions).toHaveLength(5);
  });

  it("devuelve la última carrera y la próxima", async () => {
    const last = await (await api("/races/last")).json<{ data: { round: number } }>();
    expect(last.data.round).toBe(1);
    const next = await api("/races/next");
    expect([200, 404]).toContain(next.status);
  });

  it("devuelve la clasificación de constructores", async () => {
    const body = await (await api("/seasons/2026/standings/constructors")).json<{ data: { rows: { constructor: { id: string }; gapToLeader: number }[] } }>();
    expect(body.data.rows[0]).toMatchObject({ constructor: { id: "mercedes" }, gapToLeader: 0 });
  });
});

describe("errores", () => {
  it.each([
    ["/seasons/abc/schedule", 400],
    ["/seasons/1900/schedule", 400],
    ["/seasons/2026/schedule?x=1", 400],
    ["/seasons/2026/races/99", 404],
    ["/seasons/1990/schedule", 404],
    ["/nada", 404],
  ])("%s → %i con el formato uniforme", async (path, status) => {
    const res = await api(path);
    expect(res.status).toBe(status);
    const body = await res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toMatch(/^[a-z_]+$/);
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("rechaza métodos de escritura con 405", async () => {
    const res = await api("/seasons/2026/schedule", { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
  });
});

describe("seguridad", () => {
  it("aplica CORS abierto sin credenciales y cabeceras de seguridad", async () => {
    const res = await api("/seasons/2026/schedule");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=63072000");
  });

  it("responde al preflight", async () => {
    const res = await api("/seasons/2026/schedule", { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, HEAD, OPTIONS");
  });

  it("limita las peticiones por IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 65; i++) {
      statuses.push((await api("/seasons/2026/races/1", { headers: { "cf-connecting-ip": "203.0.113.7" } })).status);
    }
    expect(statuses).toContain(429);
  });

  it("también limita lo que llega por el proxy /api de la web, con la IP del visitante (D-26)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 65; i++) {
      statuses.push((await api("/seasons/2026/races/1", { headers: { "x-paddock-proxy-ip": "203.0.113.9" } })).status);
    }
    expect(statuses).toContain(429);
    // Las llamadas internas de la web (render en servidor) no llevan esa cabecera y no se limitan.
    expect((await api("/seasons/2026/races/1")).status).toBe(200);
  });
});

describe("servicio", () => {
  it("comprueba la salud", async () => {
    const res = await api("/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("publica la documentación OpenAPI", async () => {
    const doc = await (await api("/docs")).json<{ openapi: string; paths: Record<string, unknown> }>();
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toContain("/api/v1/seasons/{season}/schedule");
  });
});

describe("fase 2: histórico", () => {
  const data = async <T>(path: string) => {
    const res = await api(path);
    expect(res.status, path).toBe(200);
    return (await res.json<{ data: T }>()).data;
  };

  it("devuelve Q1–Q3 y paradas de una carrera", async () => {
    const q = await data<{ position: number; q3: string | null }[]>("/seasons/2026/races/1/qualifying");
    expect(q[0]).toMatchObject({ position: 1 });
    const p = await data<{ lap: number; durationMs: number }[]>("/seasons/2026/races/1/pitstops");
    expect(p.length).toBeGreaterThan(10);
    expect((await api("/seasons/2026/races/1/sprint")).status).toBe(404);
  });

  it("navega entre carreras", async () => {
    const nav = await data<{ previous: unknown; next: { round: number } }>("/seasons/2026/races/1/navigation");
    expect(nav.previous).toBeNull();
    expect(nav.next.round).toBe(2);
  });

  it("devuelve la evolución del campeonato y la clasificación tras una ronda", async () => {
    const history = await data<{ rounds: unknown[]; drivers: { points: (number | null)[] }[] }>("/seasons/2026/standings/history");
    expect(history.rounds).toHaveLength(1);
    expect(history.drivers[0]!.points).toEqual([380]);
    expect((await api("/seasons/2026/rounds/19/standings/drivers")).status).toBe(200);
    expect((await api("/seasons/2026/rounds/5/standings/drivers")).status).toBe(404);
  });

  it("recalcula los puntos con el sistema actual, rotulado como recálculo (HIS-06)", async () => {
    const r = await data<{ races: number; sprints: number; rows: { position: number; driver: { id: string }; points: number; wins: number; actualPosition: number | null }[] }>(
      "/seasons/2026/standings/recalculated",
    );
    expect(r).toMatchObject({ races: 1, sprints: 0 });
    expect(r.rows[0]).toMatchObject({ position: 1, driver: { id: "russell" }, points: 25, wins: 1 });
    expect(r.rows[1]!.points).toBe(18);
    expect(r.rows.every((row) => row.actualPosition !== undefined)).toBe(true);
    expect((await api("/seasons/2025/standings/recalculated")).status).toBe(404);
  });

  it("devuelve la ficha de un piloto con estadísticas definidas", async () => {
    const d = await data<{ stats: { wins: number; races: number; poles: number }; seasons: unknown[] }>("/drivers/russell");
    expect(d.stats).toMatchObject({ wins: 1, races: 1, poles: 1 });
    expect(d.seasons).toHaveLength(1);
    expect((await api("/drivers/no_existe")).status).toBe(404);
    expect((await api("/drivers/Bad%20Id")).status).toBe(400);
  });

  it("devuelve fichas de equipo y circuito", async () => {
    const c = await data<{ stats: { wins: number } }>("/constructors/mercedes");
    expect(c.stats.wins).toBe(1);
    const circuit = await data<{ races: { winner: { id: string } | null }[] }>("/circuits/albert_park");
    expect(circuit.races[0]!.winner?.id).toBe("russell");
  });

  it("la ficha de circuito trae vueltas y vuelta rápida de carrera calculadas (CON-05)", async () => {
    const circuit = await data<{ facts: { laps: { season: number; laps: number } | null; fastestRaceLap: { time: string; season: number } | null } }>(
      "/circuits/albert_park",
    );
    expect(circuit.facts.laps).toMatchObject({ season: 2026 });
    expect(circuit.facts.laps!.laps).toBeGreaterThan(50);
    expect(circuit.facts.fastestRaceLap?.time).toMatch(/^\d:\d{2}\.\d{3}$/);
  });

  it("compara dos pilotos", async () => {
    const cmp = await data<{ headToHead: { races: unknown[]; aAhead: number; bAhead: number } }>("/compare/drivers/russell/antonelli");
    expect(cmp.headToHead.races).toHaveLength(1);
    expect(cmp.headToHead.aAhead + cmp.headToHead.bAhead).toBe(1);
  });

  it("devuelve récords y rechaza tipos desconocidos", async () => {
    const wins = await data<{ rank: number; driver: { id: string }; value: number }[]>("/records/wins");
    expect(wins[0]).toMatchObject({ rank: 1, driver: { id: "russell" }, value: 1 });
    const comebacks = await data<{ value: number; detail: string }[]>("/records/comebacks");
    expect(comebacks[0]!.detail).toContain("2026");
    expect((await api("/records/nada")).status).toBe(400);
  });

  it("busca pilotos, equipos y circuitos", async () => {
    const res = await api("/search?q=russ");
    const body = await res.json<{ data: { kind: string; id: string }[] }>();
    expect(body.data[0]).toMatchObject({ kind: "driver", id: "russell" });
    expect((await api("/search?q=r")).status).toBe(400);
    expect((await api("/search?q=russ&x=1")).status).toBe(400);
    const tricky = await api("/search?q=%25%27%3B--");
    expect(tricky.status).toBe(200);
  });

  it("lista las temporadas", async () => {
    expect(await data<number[]>("/seasons")).toEqual([2026]);
  });
});

describe("fase 3: zona técnica", () => {
  it("sirve los análisis guardados en R2 con fuente OpenF1", async () => {
    const writer = createF1Writer(env.DB);
    await env.ANALYSIS.put("analysis/2026/1/v1/strategy.json", JSON.stringify({ laps: 58, drivers: [] }));
    await env.ANALYSIS.put("analysis/2026/1/v1/telemetry/63.json", JSON.stringify({ lap: 40 }));
    await writer.saveAnalysis({
      season: 2026,
      round: 1,
      version: 1,
      sessionKey: 9999,
      tools: ["strategy", "telemetry"],
      telemetryDrivers: [63],
      createdAt: "2026-03-08T10:00:00.000Z",
    });

    const list = await (await api("/analysis")).json<{ data: { season: number; round: number }[] }>();
    expect(list.data[0]).toMatchObject({ season: 2026, round: 1 });

    const res = await api("/seasons/2026/races/1/qualifying");
    expect(res.status).toBe(200);

    const strategy = await api("/analysis/2026/1/strategy");
    expect(strategy.status).toBe(200);
    const body = await strategy.json<{ data: { laps: number }; source: string[] }>();
    expect(body.data.laps).toBe(58);
    expect(body.source).toEqual(["OpenF1"]);

    expect((await api("/analysis/2026/1/telemetry/63")).status).toBe(200);
    expect((await api("/analysis/2026/1/telemetry/99")).status).toBe(404);
    expect((await api("/analysis/2026/1/pace")).status).toBe(404);
    expect((await api("/analysis/2026/1/nada")).status).toBe(400);
    expect((await api("/analysis/2026/2")).status).toBe(404);
  });

  it("un análisis rehecho (otra versión) se sirve al momento, sin esperar a que caduque la caché", async () => {
    const writer = createF1Writer(env.DB);
    const base = { season: 2026, round: 1, sessionKey: 9999, tools: ["strategy"], telemetryDrivers: [] };
    await env.ANALYSIS.put("analysis/2026/1/v1/strategy.json", JSON.stringify({ laps: 58, drivers: [] }));
    await writer.saveAnalysis({ ...base, version: 1, createdAt: "2026-03-08T10:00:00.000Z" });
    expect((await (await api("/analysis/2026/1/strategy")).json<{ data: { laps: number } }>()).data.laps).toBe(58);

    await env.ANALYSIS.put("analysis/2026/1/v2/strategy.json", JSON.stringify({ laps: 57, drivers: [] }));
    await writer.saveAnalysis({ ...base, version: 2, createdAt: "2026-11-06T18:00:00.000Z" });
    expect((await (await api("/analysis/2026/1/strategy")).json<{ data: { laps: number } }>()).data.laps).toBe(57);
  });
});
