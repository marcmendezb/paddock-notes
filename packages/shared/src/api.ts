/** Contrato de la API pública /api/v1 (apis.md §6, D-06). */

export type ErrorCode =
  | "invalid_parameter"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "rate_limited"
  | "internal_error"
  | "unavailable";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_parameter: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  rate_limited: 429,
  internal_error: 500,
  unavailable: 503,
};

export interface ApiError {
  error: { code: ErrorCode; message: string };
}

export interface ApiEnvelope<T> {
  data: T;
  source: string[];
  license: string;
  /** Última ingesta correcta del recurso, en ISO 8601 UTC. */
  updated_at: string | null;
}

export interface ScheduleSession {
  kind: SessionKind;
  /** Inicio en ISO 8601 UTC, o null si la fuente solo da la fecha. */
  startsAt: string | null;
  date: string;
}

export type SessionKind =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint_qualifying"
  | "sprint"
  | "qualifying"
  | "race";

export type RoundStatus = "completed" | "next" | "upcoming" | "cancelled";

export interface CircuitSummary {
  id: string;
  name: string;
  locality: string;
  country: string;
  /** Coordenadas del circuito, para el mapa de la temporada (NUC-17). */
  lat: number;
  lng: number;
}

export interface RaceSummary {
  season: number;
  round: number;
  name: string;
  date: string;
  startsAt: string | null;
  circuit: CircuitSummary;
  isSprintWeekend: boolean;
  status: RoundStatus;
  winner: DriverRef | null;
  sessions: ScheduleSession[];
}

export interface RaceDetail extends RaceSummary {
  results: RaceResultRow[];
  /** Resultado provisional de OpenF1, sin la confirmación oficial de Jolpica (D-31). */
  provisional?: boolean;
}

export interface DriverRef {
  id: string;
  code: string | null;
  givenName: string;
  familyName: string;
}

export interface ConstructorRef {
  id: string;
  name: string;
}

export interface RaceResultRow {
  position: number | null;
  positionText: string;
  driver: DriverRef;
  constructor: ConstructorRef;
  grid: number | null;
  /** Posiciones ganadas (+) o perdidas (−); null si salió desde boxes o no terminó (NUC-22). */
  positionsGained: number | null;
  laps: number;
  time: string | null;
  status: string;
  points: number;
  fastestLap: { rank: number; lap: number | null; time: string | null } | null;
}

export interface DriverStandingRow {
  position: number | null;
  driver: DriverRef;
  constructors: ConstructorRef[];
  wins: number;
  podiums: number;
  points: number;
  gapToLeader: number;
}

export interface ConstructorStandingRow {
  position: number | null;
  constructor: ConstructorRef;
  wins: number;
  points: number;
  gapToLeader: number;
}

export interface Standings<Row> {
  season: number;
  /** Ronda tras la que se calculó la clasificación. */
  round: number;
  rows: Row[];
}

// ---- Fase 2: histórico ------------------------------------------------------------------------

export interface QualifyingEntry {
  position: number | null;
  driver: DriverRef;
  constructor: ConstructorRef;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface PitStopEntry {
  driver: DriverRef;
  stop: number;
  lap: number;
  /** Tiempo en el pit lane (entrada, parada y salida). */
  duration: string;
  durationMs: number | null;
}

export interface RaceNavigation {
  previous: { season: number; round: number; name: string } | null;
  next: { season: number; round: number; name: string } | null;
  /** El mismo Gran Premio en otras temporadas, del más reciente al más antiguo. */
  otherYears: { season: number; round: number }[];
}

export interface StandingsHistory {
  season: number;
  rounds: { round: number; name: string }[];
  drivers: {
    driver: DriverRef;
    /** Puntos acumulados tras cada ronda (null si aún no tenía clasificación). */
    points: (number | null)[];
    /** Resultado en cada carrera: "1", "R", "DNS"... null si no participó. */
    results: (string | null)[];
    finalPosition: number | null;
  }[];
}

export interface CareerStats {
  races: number;
  wins: number;
  /** Salidas desde la primera posición de la parrilla. */
  poles: number;
  podiums: number;
  /** Suma de los puntos obtenidos en carrera y sprint, con el sistema de cada época. */
  points: number;
  dnfs: number;
  bestFinish: number | null;
  firstRace: { season: number; round: number; name: string } | null;
  lastRace: { season: number; round: number; name: string } | null;
}

/** Entrada del índice de pilotos: su primera y última temporada en los datos cargados. */
export interface DriverIndexEntry {
  driver: DriverRef;
  first: number;
  last: number;
  races: number;
}

export interface DriverProfile {
  driver: DriverRef & { number: number | null; nationality: string | null; dateOfBirth: string | null };
  stats: CareerStats;
  titles: number[];
  seasons: {
    season: number;
    constructors: ConstructorRef[];
    position: number | null;
    points: number;
    wins: number;
    races: number;
  }[];
  /** Carreras en las que coincidió con un compañero de equipo y ambos terminaron clasificados. */
  teammates: { races: number; ahead: number };
}

export interface ConstructorProfile {
  constructor: ConstructorRef & { nationality: string | null };
  stats: { races: number; wins: number; podiums: number; points: number; poles: number };
  titles: number[];
  driverTitles: { season: number; driver: DriverRef }[];
  seasons: { season: number; drivers: DriverRef[]; position: number | null; points: number | null; wins: number }[];
}

export interface CircuitProfile {
  circuit: CircuitSummary & { lat: number; lng: number };
  races: { season: number; round: number; name: string; date: string; winner: DriverRef | null; constructor: ConstructorRef | null }[];
  /** Datos de la ficha (CON-05), calculados con los resultados guardados. */
  facts: {
    /** Vueltas de la última carrera disputada. */
    laps: { season: number; laps: number } | null;
    /** Vuelta rápida en carrera más rápida de los datos (Jolpica la tiene desde 2004). */
    fastestRaceLap: { time: string; season: number; driver: DriverRef } | null;
  };
}

export interface DriverComparison {
  a: DriverProfile;
  b: DriverProfile;
  /** Carreras en las que ambos terminaron clasificados. */
  headToHead: {
    races: { season: number; round: number; name: string; a: number; b: number }[];
    aAhead: number;
    bAhead: number;
  };
}

export type RecordType = "wins" | "poles" | "podiums" | "points" | "starts" | "comebacks" | "dnfs" | "win-streak";

export interface RecordEntry {
  rank: number;
  driver: DriverRef;
  value: number;
  /** Contexto del récord: la carrera de una remontada o el tramo de una racha. */
  detail: string | null;
}

export interface SearchResult {
  kind: "driver" | "constructor" | "circuit";
  id: string;
  label: string;
  detail: string | null;
}

export interface HistoryEvent {
  season: number;
  round: number;
  name: string;
  date: string;
  winner: DriverRef | null;
  constructor: ConstructorRef | null;
}

/** Clasificación de pilotos recalculada con el sistema de puntos actual (HIS-06). */
export interface RecalculatedStandings {
  season: number;
  races: number;
  sprints: number;
  rows: {
    position: number;
    driver: DriverRef;
    points: number;
    wins: number;
    /** Posición y puntos reales al final de la temporada (o tras la última ronda disputada). */
    actualPosition: number | null;
    actualPoints: number | null;
  }[];
}
