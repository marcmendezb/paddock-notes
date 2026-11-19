import { describe, expect, it } from "vitest";
import * as s from "@paddock/shared/openf1";
import driversJson from "../../../fixtures/openf1/race-drivers.json";
import stintsJson from "../../../fixtures/openf1/race-stints.json";
import pitJson from "../../../fixtures/openf1/race-pit.json";
import lapsJson from "../../../fixtures/openf1/race-laps.json";
import rcJson from "../../../fixtures/openf1/race-race_control.json";
import posJson from "../../../fixtures/openf1/race-position.json";
import weatherJson from "../../../fixtures/openf1/race-weather.json";
import carJson from "../../../fixtures/openf1/lap-car_data.json";
import locJson from "../../../fixtures/openf1/lap-location.json";
import { delta, driverInfos, linearFit, neutralisedPeriods, pace, replay, sectors, strategy, telemetry } from "../src";

const drivers = s.list(s.driverSchema).parse(driversJson);
const stints = s.list(s.stintSchema).parse(stintsJson);
const pits = s.list(s.pitSchema).parse(pitJson);
const laps = s.list(s.lapSchema).parse(lapsJson);
const rc = s.list(s.raceControlSchema).parse(rcJson);
const positions = s.list(s.positionSchema).parse(posJson);
const totalLaps = Math.max(...laps.map((l) => l.lap_number));
const infos = driverInfos(drivers, positions);
const neutralised = neutralisedPeriods(rc, totalLaps);
const strat = strategy(infos, stints, pits, totalLaps, neutralised);
const pitLaps = new Map(strat.drivers.map((d) => [d.number, d.pitLaps]));

describe("Mexico 2026 analysis with real OpenF1 data", () => {
  it("sorts drivers by finishing position", () => {
    expect(infos).toHaveLength(22);
    expect(infos[0]!.finish).toBe(1);
    expect(infos[0]!.name).toMatch(/^[A-Z][a-z]+ [A-Z]/);
  });

  it("detects VSC, safety cars, and red flag", () => {
    expect(neutralised).toEqual([
      { kind: "VSC", fromLap: 7, toLap: 8 },
      { kind: "SC", fromLap: 44, toLap: 45 },
      { kind: "RED", fromLap: 45, toLap: 46 },
      { kind: "SC", fromLap: 59, toLap: 62 },
    ]);
  });

  it("reconstructs the winner strategy", () => {
    const winner = strat.drivers[0]!;
    expect(winner.stints.length).toBeGreaterThanOrEqual(2);
    expect(winner.stints[0]!.fromLap).toBe(1);
    expect(winner.stints.at(-1)!.toLap).toBe(totalLaps);
    expect(strat.facts.winnerCompounds.length).toBe(winner.stints.length);
    expect(Object.values(strat.facts.stops).reduce((a, b) => a + b, 0)).toBeGreaterThan(10);
  });

  it("flags laps unsuitable for pace comparison", () => {
    const p = pace(infos, laps, stints, pitLaps, totalLaps, neutralised);
    const winner = p.drivers[0]!;
    expect(winner.laps.find((l) => l.lap === 1)?.excluded).toBe("first");
    expect(winner.laps.find((l) => l.lap === 60)?.excluded).toBe("neutralised");
    expect(winner.laps.filter((l) => l.excluded === null).length).toBeGreaterThan(40);
    expect(winner.stints.every((st) => st.mean === null || st.mean > 70)).toBe(true);
  });

  it("computes best sectors", () => {
    const sec = sectors(infos, laps, pitLaps, neutralised);
    expect(sec.best.every((b) => b !== null && b > 15 && b < 40)).toBe(true);
    expect(sec.facts.fastestBySector.every((c) => typeof c === "string")).toBe(true);
  });

  it("reconstructs lap-by-lap positions", () => {
    const r = replay(infos, laps, positions, totalLaps);
    const winner = r.drivers[0]!;
    expect(winner.positions.at(-1)).toBe(1);
    const lastLap = r.drivers.map((d) => d.positions.at(-1)).filter((p) => p !== null);
    expect(new Set(lastLap).size).toBe(lastLap.length);
  });

  it("downsamples lap telemetry and meets the data budget (TEC-13)", () => {
    const fastest = laps.filter((l) => l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration! - b.lap_duration!)[0]!;
    const info = infos.find((d) => d.number === fastest.driver_number)!;
    const t = telemetry(info, fastest.lap_number, fastest.date_start!, fastest.lap_duration!, s.list(s.carDataSchema).parse(carJson), s.list(s.locationSchema).parse(locJson))!;
    expect(t.distance.at(-1)).toBeGreaterThan(4100);
    expect(t.distance.length).toBeLessThan(500);
    expect(Math.max(...t.speed)).toBeGreaterThan(300);
    expect(t.brake.every((b) => b === 0 || b === 1)).toBe(true);
    expect(t.time.at(-1)).toBeLessThanOrEqual(fastest.lap_duration!);
    const bytes = new TextEncoder().encode(JSON.stringify(t)).length;
    expect(bytes * 2).toBeLessThan(300_000);
    const d = delta(t, t);
    expect(d.delta.every((v) => v === 0)).toBe(true);
  });
});

describe("utilities", () => {
  it("ordinary least squares line fit", () => {
    expect(linearFit([[1, 80], [2, 80.1], [3, 80.2]])!.slope).toBeCloseTo(0.1);
    expect(linearFit([[1, 80]])).toBeNull();
  });
});

describe("circuit layout (NUC-43)", async () => {
  const { circuitLayout } = await import("../src");
  it("normalizes and reduces lap coordinates", () => {
    const fastest = laps.filter((l) => l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration! - b.lap_duration!)[0]!;
    const info = infos.find((d) => d.number === fastest.driver_number)!;
    const t = telemetry(info, fastest.lap_number, fastest.date_start!, fastest.lap_duration!, s.list(s.carDataSchema).parse(carJson), s.list(s.locationSchema).parse(locJson))!;
    const layout = circuitLayout(t);
    expect(layout.points.length).toBeGreaterThan(80);
    expect(layout.points.length).toBeLessThan(150);
    expect(Math.max(...layout.points.flat())).toBeLessThanOrEqual(1000);
    expect(layout.length).toBeGreaterThan(4100);
  });

  it("detects heavy braking zones in order along the track layout (NUC-44)", () => {
    const fastest = laps.filter((l) => l.lap_duration && !l.is_pit_out_lap).sort((a, b) => a.lap_duration! - b.lap_duration!)[0]!;
    const info = infos.find((d) => d.number === fastest.driver_number)!;
    const t = telemetry(info, fastest.lap_number, fastest.date_start!, fastest.lap_duration!, s.list(s.carDataSchema).parse(carJson), s.list(s.locationSchema).parse(locJson))!;
    const { corners } = circuitLayout(t);
    expect(corners.length).toBeGreaterThanOrEqual(5);
    expect(corners.length).toBeLessThanOrEqual(16);
    expect(corners.map((c) => c.n)).toEqual(corners.map((_, i) => i + 1));
    // Ordered and separated by at least the merge distance (120 m): never two zones in the same place.
    const length = t.distance.at(-1)!;
    for (let i = 1; i < corners.length; i++) expect((corners[i]!.at - corners[i - 1]!.at) * length).toBeGreaterThanOrEqual(110);
    for (const c of corners) {
      expect(c.speed).toBeGreaterThan(40);
      expect(c.speed).toBeLessThan(300);
      expect(Math.max(...c.point)).toBeLessThanOrEqual(1000);
    }
  });
});

describe("braking zones on synthetic data", async () => {
  const { brakingZones } = await import("../src");
  const make = (speed: number[]) =>
    ({ step: 10, distance: speed.map((_, i) => i * 10), speed, gear: speed.map((v) => (v < 120 ? 3 : 7)) }) as Parameters<typeof brakingZones>[0];
  const flat = (v: number, n: number) => Array.from({ length: n }, () => v);
  const dip = (to: number) => [...Array.from({ length: 10 }, (_, i) => 300 - ((300 - to) * (i + 1)) / 10), ...Array.from({ length: 10 }, (_, i) => to + ((300 - to) * (i + 1)) / 10)];

  it("one braking zone per slow corner; a chicane counts once; minor lift does not count", () => {
    // Chicane: two local minima 40 m apart (110 and 100 km/h) with a brief rise to 150 in between.
    const chicane = [280, 250, 220, 190, 160, 130, 110, 130, 150, 130, 100, 130, 170, 210, 250, 280];
    const speed = [...flat(300, 60), ...dip(90), ...flat(300, 60), ...chicane, ...flat(300, 60), ...flat(290, 5), ...flat(300, 60)];
    const zones = brakingZones(make(speed));
    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ n: 1, gear: 3 });
    expect(zones[0]!.speed).toBeLessThan(100);
    expect(zones[1]!.speed).toBe(100);
  });
});

describe("weather (NUC-27)", async () => {
  const { weatherSummary } = await import("../src");
  it("summarizes temperatures and rainfall", () => {
    const w = weatherSummary(s.list(s.weatherSchema).parse(weatherJson))!;
    expect(w.air![0]).toBeLessThanOrEqual(w.air![1]);
    expect(w.track![1]).toBeGreaterThan(w.air![0]);
    expect(typeof w.rain).toBe("boolean");
    expect(weatherSummary([])).toBeNull();
  });
});

describe("pace: anomalous laps (v2)", async () => {
  const { repairPace } = await import("../src");
  it("restart lap after a red flag does not skew mean or trend", () => {
    const laps = [
      { lap: 46, time: 2433.4, stint: 3, excluded: "pit" as const },
      { lap: 47, time: 150.0, stint: 3, excluded: null },
      ...Array.from({ length: 12 }, (_, i) => ({ lap: 48 + i, time: 80 - i * 0.02, stint: 3, excluded: null })),
    ];
    const data = {
      laps: 71,
      neutralised: [],
      drivers: [{ number: 3, code: "VER", name: "Max Verstappen", team: "Red Bull", finish: 1, laps, stints: [{ stint: 3, fromLap: 46, toLap: 59, mean: 83.07, slope: -0.649 }] }],
    };
    const fixed = repairPace(data as Parameters<typeof repairPace>[0]).drivers[0]!;
    expect(fixed.laps.find((l) => l.lap === 47)!.excluded).toBe("slow");
    const st = fixed.stints[0]!;
    expect(st.mean).toBeCloseTo(79.89, 2);
    expect(st.slope).toBeCloseTo(-0.02, 3);
    expect(st.trend![0]).toBe(48);
    expect(st.trend![2]).toBe(59);
  });
});
