import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Tablas de datos de F1 (fase 1). Solo `paddock-ingest` escribe en ellas (D-14). */

export const circuits = sqliteTable("circuits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  locality: text("locality").notNull(),
  country: text("country").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const drivers = sqliteTable("drivers", {
  id: text("id").primaryKey(),
  code: text("code"),
  number: integer("number"),
  givenName: text("given_name").notNull(),
  familyName: text("family_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  nationality: text("nationality"),
});

export const constructors = sqliteTable("constructors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nationality: text("nationality"),
});

export const races = sqliteTable(
  "races",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    name: text("name").notNull(),
    circuitId: text("circuit_id")
      .notNull()
      .references(() => circuits.id),
    date: text("date").notNull(),
    startsAt: text("starts_at"),
    isSprintWeekend: integer("is_sprint_weekend", { mode: "boolean" }).notNull().default(false),
    /** Marca manual: Jolpica no informa de cancelaciones (NUC-12). */
    cancelled: integer("cancelled", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.season, t.round] }), index("races_date_idx").on(t.date)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    kind: text("kind", {
      enum: ["fp1", "fp2", "fp3", "sprint_qualifying", "sprint", "qualifying", "race"],
    }).notNull(),
    date: text("date").notNull(),
    startsAt: text("starts_at"),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.kind] }), index("sessions_starts_at_idx").on(t.startsAt)],
);

export const results = sqliteTable(
  "results",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    kind: text("kind", { enum: ["race", "sprint"] }).notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id),
    constructorId: text("constructor_id")
      .notNull()
      .references(() => constructors.id),
    /** Hasta 1957 un piloto podía compartir coche; el número distingue las entradas. */
    carNumber: integer("car_number").notNull().default(0),
    position: integer("position"),
    positionText: text("position_text").notNull(),
    grid: integer("grid"),
    laps: integer("laps").notNull(),
    status: text("status").notNull(),
    timeText: text("time_text"),
    millis: integer("millis"),
    points: real("points").notNull(),
    fastestLapRank: integer("fastest_lap_rank"),
    fastestLapLap: integer("fastest_lap_lap"),
    fastestLapTime: text("fastest_lap_time"),
  },
  (t) => [
    primaryKey({ columns: [t.season, t.round, t.kind, t.driverId, t.constructorId, t.carNumber] }),
    index("results_driver_idx").on(t.driverId),
    index("results_position_idx").on(t.season, t.kind, t.position),
  ],
);

/**
 * Resultado provisional de una carrera, leído de OpenF1 minutos después de la bandera a cuadros (D-31).
 * Solo se sirve mientras Jolpica no publica el oficial y no cuenta para clasificaciones ni récords.
 */
export const provisionalResults = sqliteTable(
  "provisional_results",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id),
    constructorId: text("constructor_id")
      .notNull()
      .references(() => constructors.id),
    position: integer("position"),
    positionText: text("position_text").notNull(),
    laps: integer("laps").notNull(),
    status: text("status").notNull(),
    timeText: text("time_text"),
    points: real("points").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.driverId] })],
);

export const qualifying = sqliteTable(
  "qualifying",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id),
    constructorId: text("constructor_id")
      .notNull()
      .references(() => constructors.id),
    carNumber: integer("car_number"),
    position: integer("position"),
    q1: text("q1"),
    q2: text("q2"),
    q3: text("q3"),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.driverId] })],
);

export const pitStops = sqliteTable(
  "pit_stops",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id),
    stop: integer("stop").notNull(),
    lap: integer("lap").notNull(),
    timeOfDay: text("time_of_day").notNull(),
    /** Tiempo en el pit lane (entrada, parada y salida), no solo el tiempo parado. */
    duration: text("duration").notNull(),
    durationMs: integer("duration_ms"),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.driverId, t.stop] })],
);

/** Una fila por piloto y vuelta (desde 1996). La tabla más grande: ~660.000 filas para todo el histórico. */
export const laps = sqliteTable(
  "laps",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    driverId: text("driver_id").notNull(),
    lap: integer("lap").notNull(),
    position: integer("position"),
    timeMs: integer("time_ms"),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.driverId, t.lap] })],
);

export const standingsDrivers = sqliteTable(
  "standings_drivers",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id),
    position: integer("position"),
    positionText: text("position_text").notNull(),
    points: real("points").notNull(),
    wins: integer("wins").notNull(),
    /** JSON con los ID de constructores de la temporada. */
    constructorIds: text("constructor_ids", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.driverId] })],
);

export const standingsConstructors = sqliteTable(
  "standings_constructors",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    constructorId: text("constructor_id")
      .notNull()
      .references(() => constructors.id),
    position: integer("position"),
    positionText: text("position_text").notNull(),
    points: real("points").notNull(),
    wins: integer("wins").notNull(),
  },
  (t) => [primaryKey({ columns: [t.season, t.round, t.constructorId] })],
);

/** Análisis de la zona técnica calculados tras cada carrera (fase 3). Los JSON viven en R2. */
export const analysisArtifacts = sqliteTable(
  "analysis_artifacts",
  {
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    version: integer("version").notNull(),
    sessionKey: integer("session_key").notNull(),
    tools: text("tools", { mode: "json" }).$type<string[]>().notNull(),
    telemetryDrivers: text("telemetry_drivers", { mode: "json" }).$type<number[]>().notNull(),
    /** Resumen del clima de la carrera (NUC-27). */
    weather: text("weather", { mode: "json" }).$type<{ air: [number, number] | null; track: [number, number] | null; rain: boolean } | null>(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.season, t.round] })],
);

/** Última ingesta correcta de cada recurso, para `updated_at` y `X-Data-Stale` (D-06). */
export const ingestState = sqliteTable("ingest_state", {
  resource: text("resource").primaryKey(),
  updatedAt: text("updated_at").notNull(),
});

/** Registro de cada ejecución de la ingesta (página interna /status). */
export const ingestRuns = sqliteTable(
  "ingest_runs",
  {
    id: text("id").primaryKey(),
    task: text("task").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status", { enum: ["running", "ok", "error", "quarantined"] }).notNull(),
    requests: integer("requests").notNull().default(0),
    rowsWritten: integer("rows_written").notNull().default(0),
    detail: text("detail"),
  },
  (t) => [index("ingest_runs_started_idx").on(t.startedAt)],
);

/** Claves de `ingest_state`. */
export const resourceKey = {
  schedule: (season: number) => `schedule:${season}`,
  results: (season: number, round: number) => `results:${season}:${round}`,
  standings: (season: number) => `standings:${season}`,
  laps: (season: number, round: number) => `laps:${season}:${round}`,
  backfill: (season: number) => `backfill:${season}`,
};
export * from "./community-schema";
