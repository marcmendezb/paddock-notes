/** Contract of the public /api/v1 API (apis.md §6, D-06). */

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
  /** The resource's last successful ingestion, in ISO 8601 UTC. */
  updated_at: string | null;
}

export interface ScheduleSession {
  kind: SessionKind;
  /** Start in ISO 8601 UTC, or null if the source only gives the date. */
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
  /** The circuit's coordinates, for the season map (NUC-17). */
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
  /** Provisional result from OpenF1, without Jolpica's official confirmation (D-31). */
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
  /** Positions gained (+) or lost (−); null if the driver started from the pit lane or did not finish (NUC-22). */
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
  /** Round after which the standings were computed. */
  round: number;
  rows: Row[];
}

// ---- Phase 2: history --------------------------------------------------------------------------

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
  /** Time in the pit lane (entry, stop and exit). */
  duration: string;
  durationMs: number | null;
}

export interface RaceNavigation {
  previous: { season: number; round: number; name: string } | null;
  next: { season: number; round: number; name: string } | null;
  /** The same Grand Prix in other seasons, most recent first. */
  otherYears: { season: number; round: number }[];
}

export interface StandingsHistory {
  season: number;
  rounds: { round: number; name: string }[];
  drivers: {
    driver: DriverRef;
    /** Points accumulated after each round (null if there were no standings yet). */
    points: (number | null)[];
    /** Result in each race: "1", "R", "DNS"... null if the driver did not take part. */
    results: (string | null)[];
    finalPosition: number | null;
  }[];
}

export interface CareerStats {
  races: number;
  wins: number;
  /** Starts from the first grid position. */
  poles: number;
  podiums: number;
  /** Sum of the points scored in races and sprints, under each era's system. */
  points: number;
  dnfs: number;
  bestFinish: number | null;
  firstRace: { season: number; round: number; name: string } | null;
  lastRace: { season: number; round: number; name: string } | null;
}

/** An entry in the driver index: their first and last season in the loaded data. */
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
  /** Races shared with a teammate in which both were classified. */
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
  /** The guide's figures (CON-05), computed from the stored results. */
  facts: {
    /** Laps of the last race run. */
    laps: { season: number; laps: number } | null;
    /** The fastest race lap in the data (Jolpica has it since 2004). */
    fastestRaceLap: { time: string; season: number; driver: DriverRef } | null;
  };
}

export interface DriverComparison {
  a: DriverProfile;
  b: DriverProfile;
  /** Races in which both were classified. */
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
  /** The record's context: the race of a comeback or the stretch of a streak. */
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

/** Drivers' standings recalculated under today's points system (HIS-06). */
export interface RecalculatedStandings {
  season: number;
  races: number;
  sprints: number;
  rows: {
    position: number;
    driver: DriverRef;
    points: number;
    wins: number;
    /** Real position and points at the end of the season (or after the last round run). */
    actualPosition: number | null;
    actualPoints: number | null;
  }[];
}
