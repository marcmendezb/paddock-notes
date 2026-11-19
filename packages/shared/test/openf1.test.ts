import { describe, expect, it } from "vitest";
import * as s from "../src/openf1";
import drivers from "../../../fixtures/openf1/race-drivers.json";
import stints from "../../../fixtures/openf1/race-stints.json";
import pit from "../../../fixtures/openf1/race-pit.json";
import laps from "../../../fixtures/openf1/race-laps.json";
import rc from "../../../fixtures/openf1/race-race_control.json";
import weather from "../../../fixtures/openf1/race-weather.json";
import car from "../../../fixtures/openf1/lap-car_data.json";
import loc from "../../../fixtures/openf1/lap-location.json";
import sessions from "../../../fixtures/openf1/sessions-mexico.json";

describe("OpenF1 schemas against real data (Mexico 2026)", () => {
  it.each([
    ["sessions", s.sessionSchema, sessions],
    ["drivers", s.driverSchema, drivers],
    ["stints", s.stintSchema, stints],
    ["pit", s.pitSchema, pit],
    ["laps", s.lapSchema, laps],
    ["race_control", s.raceControlSchema, rc],
    ["weather", s.weatherSchema, weather],
    ["car_data", s.carDataSchema, car],
    ["location", s.locationSchema, loc],
  ] as const)("%s", (_, schema, data) => {
    const parsed = s.list(schema).parse(data);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
