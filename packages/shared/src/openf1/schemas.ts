import { z } from "zod";

/**
 * Esquemas de OpenF1 (apis.md §2.2). Solo los campos que usamos; el resto se ignora.
 * Todo lo externo es hostil (seguridad.md §8): lo que no cumple el esquema no se procesa.
 */

const isoDate = z.string().min(10).max(40);
const int = z.number().int();
const num = z.number();

export const sessionSchema = z.object({
  session_key: int,
  meeting_key: int,
  session_name: z.string().max(60),
  session_type: z.string().max(40),
  date_start: isoDate,
  date_end: isoDate.nullish(),
});

export const driverSchema = z.object({
  driver_number: int,
  name_acronym: z.string().max(4).nullish(),
  first_name: z.string().max(60).nullish(),
  last_name: z.string().max(60).nullish(),
  full_name: z.string().max(120).nullish(),
  team_name: z.string().max(80).nullish(),
});

export const stintSchema = z.object({
  driver_number: int,
  stint_number: int,
  lap_start: int.nullish(),
  lap_end: int.nullish(),
  compound: z.string().max(20).nullish(),
  tyre_age_at_start: int.nullish(),
});

export const pitSchema = z.object({
  driver_number: int,
  lap_number: int.nullish(),
  date: isoDate,
  lane_duration: num.nullish(),
  stop_duration: num.nullish(),
});

export const lapSchema = z.object({
  driver_number: int,
  lap_number: int,
  date_start: isoDate.nullish(),
  lap_duration: num.nullish(),
  duration_sector_1: num.nullish(),
  duration_sector_2: num.nullish(),
  duration_sector_3: num.nullish(),
  is_pit_out_lap: z.boolean().nullish(),
});

export const raceControlSchema = z.object({
  date: isoDate,
  lap_number: int.nullish(),
  category: z.string().max(40),
  flag: z.string().max(40).nullish(),
  message: z.string().max(300),
});

export const weatherSchema = z.object({
  date: isoDate,
  air_temperature: num.nullish(),
  track_temperature: num.nullish(),
  rainfall: num.nullish(),
});

export const positionSchema = z.object({
  date: isoDate,
  driver_number: int,
  position: int,
});

export const carDataSchema = z.object({
  date: isoDate,
  speed: num,
  throttle: num,
  brake: num,
  n_gear: int,
});

export const locationSchema = z.object({
  date: isoDate,
  x: num,
  y: num,
});

export const list = <T extends z.ZodType>(item: T) => z.array(item).max(100_000);

export type OpenF1Session = z.infer<typeof sessionSchema>;
export type OpenF1Driver = z.infer<typeof driverSchema>;
export type OpenF1Stint = z.infer<typeof stintSchema>;
export type OpenF1Pit = z.infer<typeof pitSchema>;
export type OpenF1Lap = z.infer<typeof lapSchema>;
export type OpenF1RaceControl = z.infer<typeof raceControlSchema>;
export type OpenF1Weather = z.infer<typeof weatherSchema>;
export type OpenF1Position = z.infer<typeof positionSchema>;
export type OpenF1CarData = z.infer<typeof carDataSchema>;
export type OpenF1Location = z.infer<typeof locationSchema>;
