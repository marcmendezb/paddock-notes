import type { z } from "zod";
import * as s from "@paddock/shared/openf1";
import type { Env } from "./env";
import { fetchJson, type FetchContext } from "./http";

/** Cliente de OpenF1 (apis.md §2.2): solo histórico, siempre filtrado por sesión. */
export function openf1Context(env: Env): FetchContext {
  return {
    env,
    policy: {
      perSecond: Number(env.OPENF1_MAX_PER_SECOND),
      perWindow: Number(env.OPENF1_MAX_PER_MINUTE),
      windowMs: 60_000,
    },
    counter: { requests: 0 },
    // La ventana de OpenF1 es de un minuto: dentro de un paso de Workflow compensa esperarla.
    maxWaitMs: 65_000,
  };
}

export function createOpenF1(ctx: FetchContext) {
  const base = ctx.env.OPENF1_BASE_URL;
  const get = <T extends z.ZodType>(path: string, schema: T) => fetchJson(ctx, `${base}/${path}`, s.list(schema));
  const bySession = <T extends z.ZodType>(endpoint: string, schema: T) => (sessionKey: number) =>
    get(`${endpoint}?session_key=${sessionKey}`, schema);

  return {
    raceSessions: (year: number) => get(`sessions?year=${year}&session_name=Race`, s.sessionSchema),
    drivers: bySession("drivers", s.driverSchema),
    stints: bySession("stints", s.stintSchema),
    pit: bySession("pit", s.pitSchema),
    laps: bySession("laps", s.lapSchema),
    raceControl: bySession("race_control", s.raceControlSchema),
    position: bySession("position", s.positionSchema),
    weather: bySession("weather", s.weatherSchema),
    /** Telemetría de un piloto acotada al intervalo de una vuelta: nunca la sesión completa. */
    carData: (sessionKey: number, driver: number, from: string, to: string) =>
      get(`car_data?session_key=${sessionKey}&driver_number=${driver}&date>=${from}&date<${to}`, s.carDataSchema),
    location: (sessionKey: number, driver: number, from: string, to: string) =>
      get(`location?session_key=${sessionKey}&driver_number=${driver}&date>=${from}&date<${to}`, s.locationSchema),
  };
}
