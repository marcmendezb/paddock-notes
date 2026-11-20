import { z } from "zod";

/**
 * Schemas for Jolpica F1's responses (Ergast-compatible).
 * Everything external is hostile (security.md §8): a response that does not match the schema is not written.
 * Jolpica returns numbers as text; they are converted here.
 */

const numeric = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .transform(Number);

const optionalNumeric = numeric.optional();

const shortText = z.string().max(200);
const id = z.string().regex(/^[a-z0-9_-]{1,64}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const utcTime = z.string().regex(/^\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/);

const sessionTime = z.object({ date: isoDate, time: utcTime.optional() });

export const circuitSchema = z.object({
  circuitId: id,
  url: z.url().optional(),
  circuitName: shortText,
  Location: z.object({
    lat: numeric,
    long: numeric,
    locality: shortText,
    country: shortText,
  }),
});

export const driverSchema = z.object({
  driverId: id,
  permanentNumber: optionalNumeric,
  code: z.string().regex(/^[A-Z]{3}$/).optional(),
  url: z.url().optional(),
  givenName: shortText,
  familyName: shortText,
  dateOfBirth: isoDate.optional(),
  nationality: shortText.optional(),
});

export const constructorSchema = z.object({
  constructorId: id,
  url: z.url().optional(),
  name: shortText,
  nationality: shortText.optional(),
});

export const scheduleRaceSchema = z.object({
  season: numeric,
  round: numeric,
  url: z.url().optional(),
  raceName: shortText,
  Circuit: circuitSchema,
  date: isoDate,
  time: utcTime.optional(),
  FirstPractice: sessionTime.optional(),
  SecondPractice: sessionTime.optional(),
  ThirdPractice: sessionTime.optional(),
  Qualifying: sessionTime.optional(),
  Sprint: sessionTime.optional(),
  SprintQualifying: sessionTime.optional(),
  SprintShootout: sessionTime.optional(),
});

export const resultSchema = z.object({
  number: optionalNumeric,
  position: optionalNumeric,
  positionText: z.string().max(4),
  points: numeric,
  Driver: driverSchema,
  Constructor: constructorSchema,
  grid: optionalNumeric,
  laps: numeric,
  status: shortText,
  Time: z.object({ millis: optionalNumeric, time: z.string().max(20) }).optional(),
  FastestLap: z
    .object({
      rank: optionalNumeric,
      lap: optionalNumeric,
      Time: z.object({ time: z.string().max(20) }).optional(),
    })
    .optional(),
});

export const qualifyingResultSchema = z.object({
  number: optionalNumeric,
  position: optionalNumeric,
  Driver: driverSchema,
  Constructor: constructorSchema,
  Q1: z.string().max(20).optional(),
  Q2: z.string().max(20).optional(),
  Q3: z.string().max(20).optional(),
});

export const pitStopSchema = z.object({
  driverId: id,
  lap: numeric,
  stop: numeric,
  time: z.string().max(20),
  duration: z.string().max(20),
});

export const lapSchema = z.object({
  number: numeric,
  Timings: z.array(z.object({ driverId: id, position: optionalNumeric, time: z.string().max(20) })),
});

export const raceWithResultsSchema = scheduleRaceSchema
  .pick({ season: true, round: true, raceName: true, Circuit: true, date: true, time: true })
  .extend({
    Results: z.array(resultSchema).optional(),
    SprintResults: z.array(resultSchema).optional(),
    QualifyingResults: z.array(qualifyingResultSchema).optional(),
    PitStops: z.array(pitStopSchema).optional(),
    Laps: z.array(lapSchema).optional(),
  });

export const driverStandingSchema = z.object({
  position: optionalNumeric,
  positionText: z.string().max(4),
  points: numeric,
  wins: numeric,
  Driver: driverSchema,
  Constructors: z.array(constructorSchema),
});

export const constructorStandingSchema = z.object({
  position: optionalNumeric,
  positionText: z.string().max(4),
  points: numeric,
  wins: numeric,
  Constructor: constructorSchema,
});

const mrData = <T extends z.ZodType>(table: T) =>
  z.object({
    MRData: z
      .object({
        limit: numeric,
        offset: numeric,
        total: numeric,
      })
      .and(table),
  });

export const scheduleResponseSchema = mrData(
  z.object({ RaceTable: z.object({ season: numeric.optional(), Races: z.array(scheduleRaceSchema) }) }),
);

export const resultsResponseSchema = mrData(
  z.object({ RaceTable: z.object({ Races: z.array(raceWithResultsSchema) }) }),
);

export const driverStandingsResponseSchema = mrData(
  z.object({
    StandingsTable: z.object({
      season: numeric.optional(),
      round: numeric.optional(),
      StandingsLists: z.array(
        z.object({ season: numeric, round: numeric, DriverStandings: z.array(driverStandingSchema) }),
      ),
    }),
  }),
);

export const constructorStandingsResponseSchema = mrData(
  z.object({
    StandingsTable: z.object({
      season: numeric.optional(),
      round: numeric.optional(),
      StandingsLists: z.array(
        z.object({
          season: numeric,
          round: numeric,
          ConstructorStandings: z.array(constructorStandingSchema),
        }),
      ),
    }),
  }),
);

export type JolpicaQualifyingResult = z.infer<typeof qualifyingResultSchema>;
export type JolpicaPitStop = z.infer<typeof pitStopSchema>;
export type JolpicaLap = z.infer<typeof lapSchema>;
export type JolpicaScheduleRace = z.infer<typeof scheduleRaceSchema>;
export type JolpicaResult = z.infer<typeof resultSchema>;
export type JolpicaRaceWithResults = z.infer<typeof raceWithResultsSchema>;
export type JolpicaDriverStanding = z.infer<typeof driverStandingSchema>;
export type JolpicaConstructorStanding = z.infer<typeof constructorStandingSchema>;
export type JolpicaDriver = z.infer<typeof driverSchema>;
export type JolpicaConstructor = z.infer<typeof constructorSchema>;
export type JolpicaCircuit = z.infer<typeof circuitSchema>;
