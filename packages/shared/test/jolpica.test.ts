import { describe, expect, it } from "vitest";
import schedule2026 from "../../../fixtures/jolpica/2026-races.json";
import results2026r1 from "../../../fixtures/jolpica/2026-1-results.json";
import results2025r24 from "../../../fixtures/jolpica/2025-24-results.json";
import sprint2021 from "../../../fixtures/jolpica/2021-sprint.json";
import driverStandings2026 from "../../../fixtures/jolpica/2026-driverstandings.json";
import constructorStandings2026 from "../../../fixtures/jolpica/2026-constructorstandings.json";
import {
  IncoherentDataError,
  constructorStandingsResponseSchema,
  driverStandingsResponseSchema,
  normalizeConstructorStandings,
  normalizeDriverStandings,
  normalizeResults,
  normalizeSchedule,
  resultsResponseSchema,
  scheduleResponseSchema,
} from "../src/jolpica";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("calendario", () => {
  const parsed = scheduleResponseSchema.parse(schedule2026);
  const { races, sessions, circuits } = normalizeSchedule(parsed.MRData.RaceTable.Races);

  it("normaliza todas las rondas en orden", () => {
    expect(races).toHaveLength(23);
    expect(races.map((r) => r.round)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });

  it("convierte fecha y hora en ISO UTC", () => {
    expect(races[0]).toMatchObject({ name: "Australian Grand Prix", startsAt: "2026-03-08T04:00:00.000Z" });
  });

  it("marca los fines de semana sprint y sus sesiones", () => {
    const china = races.find((r) => r.round === 2);
    expect(china?.isSprintWeekend).toBe(true);
    const kinds = sessions.filter((s) => s.round === 2).map((s) => s.kind);
    expect(kinds).toContain("sprint");
    expect(kinds).toContain("sprint_qualifying");
    expect(kinds.at(-1)).toBe("race");
  });

  it("deduplica los circuitos", () => {
    expect(new Set(circuits.map((c) => c.id)).size).toBe(circuits.length);
  });

  it("rechaza una ronda duplicada", () => {
    const dup = [...parsed.MRData.RaceTable.Races, parsed.MRData.RaceTable.Races[0]!];
    expect(() => normalizeSchedule(dup)).toThrow(IncoherentDataError);
  });
});

describe("resultados", () => {
  it("normaliza una carrera con no clasificados", () => {
    const parsed = resultsResponseSchema.parse(results2026r1);
    const { results, drivers } = normalizeResults(parsed.MRData.RaceTable.Races);
    expect(results[0]).toMatchObject({ driverId: "russell", position: 1, points: 25, grid: 1, kind: "race" });
    const dns = results.find((r) => r.status === "Did not start");
    expect(dns).toMatchObject({ positionText: "W", timeText: null });
    expect(drivers.find((d) => d.id === "hulkenberg")?.familyName).toBe("Hülkenberg");
  });

  it("normaliza la última carrera de 2025", () => {
    const parsed = resultsResponseSchema.parse(results2025r24);
    const { results } = normalizeResults(parsed.MRData.RaceTable.Races);
    expect(results.filter((r) => r.position === 1)).toHaveLength(1);
  });

  it("normaliza los sprints de una temporada", () => {
    const parsed = resultsResponseSchema.parse(sprint2021);
    const { results } = normalizeResults(parsed.MRData.RaceTable.Races);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.kind === "sprint")).toBe(true);
  });

  it("rechaza puntos imposibles", () => {
    const parsed = resultsResponseSchema.parse(results2026r1);
    const race = clone(parsed.MRData.RaceTable.Races[0]!);
    race.Results![0]!.points = 500;
    expect(() => normalizeResults([race])).toThrow(IncoherentDataError);
  });

  it("rechaza respuestas que no cumplen el esquema", () => {
    const bad = clone(results2026r1) as { MRData: { RaceTable: { Races: { round: string }[] } } };
    bad.MRData.RaceTable.Races[0]!.round = "<script>";
    expect(() => resultsResponseSchema.parse(bad)).toThrow();
  });
});

describe("clasificaciones", () => {
  it("normaliza la de pilotos", () => {
    const parsed = driverStandingsResponseSchema.parse(driverStandings2026);
    const list = parsed.MRData.StandingsTable.StandingsLists[0]!;
    const { standings } = normalizeDriverStandings(list.season, list.round, list.DriverStandings);
    expect(standings[0]).toMatchObject({ driverId: "antonelli", position: 1, points: 380, wins: 9 });
    expect(standings[0]!.constructorIds).toEqual(["mercedes"]);
  });

  it("normaliza la de constructores", () => {
    const parsed = constructorStandingsResponseSchema.parse(constructorStandings2026);
    const list = parsed.MRData.StandingsTable.StandingsLists[0]!;
    const { standings } = normalizeConstructorStandings(list.season, list.round, list.ConstructorStandings);
    expect(standings[0]).toMatchObject({ constructorId: "mercedes", points: 630, wins: 12 });
  });
});

describe("fase 2: clasificación, paradas y vueltas", async () => {
  const { normalizeQualifying, normalizePitStops, normalizeLaps, parseLapTime } = await import("../src/jolpica");
  const quali = (await import("../../../fixtures/jolpica/2026-19-qualifying.json")).default;
  const pits = (await import("../../../fixtures/jolpica/2026-19-pitstops.json")).default;
  const laps = (await import("../../../fixtures/jolpica/2026-19-laps-p0.json")).default;
  const empty1993 = (await import("../../../fixtures/jolpica/1993-1-qualifying.json")).default;
  const r1950 = (await import("../../../fixtures/jolpica/1950-1-results.json")).default;

  it("convierte tiempos a milisegundos", () => {
    expect(parseLapTime("1:22.167")).toBe(82_167);
    expect(parseLapTime("23.958")).toBe(23_958);
    expect(parseLapTime("40:55.302")).toBe(2_455_302);
    expect(parseLapTime("")).toBeNull();
    expect(parseLapTime("DNF")).toBeNull();
  });

  it("normaliza Q1–Q3", () => {
    const race = resultsResponseSchema.parse(quali).MRData.RaceTable.Races[0]!;
    const { qualifying } = normalizeQualifying(2026, 19, race.QualifyingResults!);
    expect(qualifying).toHaveLength(22);
    expect(qualifying[0]).toMatchObject({ driverId: "hamilton", position: 1 });
    expect(qualifying[0]!.q3).toMatch(/^\d:\d{2}\.\d{3}$/);
  });

  it("no hay clasificación antes de 1994", () => {
    expect(resultsResponseSchema.parse(empty1993).MRData.RaceTable.Races).toHaveLength(0);
  });

  it("normaliza las paradas", () => {
    const race = resultsResponseSchema.parse(pits).MRData.RaceTable.Races[0]!;
    const rows = normalizePitStops(2026, 19, race.PitStops!);
    expect(rows[0]).toMatchObject({ driverId: "alonso", lap: 3, stop: 1, durationMs: 23_958 });
  });

  it("normaliza una página de vueltas", () => {
    const race = resultsResponseSchema.parse(laps).MRData.RaceTable.Races[0]!;
    const rows = normalizeLaps(2026, 19, race.Laps!);
    expect(rows).toHaveLength(100);
    expect(rows[0]).toMatchObject({ driverId: "leclerc", lap: 1, position: 1, timeMs: 85_157 });
  });

  it("acepta los resultados de 1950", () => {
    const { results } = normalizeResults(resultsResponseSchema.parse(r1950).MRData.RaceTable.Races);
    expect(results.length).toBe(23);
  });
});
