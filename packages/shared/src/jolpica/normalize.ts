import { FIRST_SEASON } from "../constants";
import { toIsoUtc } from "../schedule";
import type { SessionKind } from "../api";
import type {
  JolpicaCircuit,
  JolpicaConstructor,
  JolpicaConstructorStanding,
  JolpicaDriver,
  JolpicaDriverStanding,
  JolpicaLap,
  JolpicaPitStop,
  JolpicaQualifyingResult,
  JolpicaRaceWithResults,
  JolpicaResult,
  JolpicaScheduleRace,
} from "./schemas";

/** Normalised rows, ready to write to D1 (packages/db). */

export interface CircuitRow {
  id: string;
  name: string;
  locality: string;
  country: string;
  lat: number;
  lng: number;
}

export interface DriverRow {
  id: string;
  code: string | null;
  number: number | null;
  givenName: string;
  familyName: string;
  dateOfBirth: string | null;
  nationality: string | null;
}

export interface ConstructorRow {
  id: string;
  name: string;
  nationality: string | null;
}

export interface RaceRow {
  season: number;
  round: number;
  name: string;
  circuitId: string;
  date: string;
  startsAt: string | null;
  isSprintWeekend: boolean;
}

export interface SessionRow {
  season: number;
  round: number;
  kind: SessionKind;
  date: string;
  startsAt: string | null;
}

export type ResultKind = "race" | "sprint";

export interface ResultRow {
  season: number;
  round: number;
  kind: ResultKind;
  driverId: string;
  constructorId: string;
  carNumber: number | null;
  position: number | null;
  positionText: string;
  grid: number | null;
  laps: number;
  status: string;
  timeText: string | null;
  millis: number | null;
  points: number;
  fastestLapRank: number | null;
  fastestLapLap: number | null;
  fastestLapTime: string | null;
}

export interface DriverStandingRow {
  season: number;
  round: number;
  driverId: string;
  position: number | null;
  positionText: string;
  points: number;
  wins: number;
  constructorIds: string[];
}

export interface ConstructorStandingRow {
  season: number;
  round: number;
  constructorId: string;
  position: number | null;
  positionText: string;
  points: number;
  wins: number;
}

/** Data that fails the consistency checks (security.md §8). It is not written. */
export class IncoherentDataError extends Error {
  override name = "IncoherentDataError";
}

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new IncoherentDataError(message);
}

function checkSeason(season: number, now = new Date()): void {
  check(season >= FIRST_SEASON && season <= now.getUTCFullYear() + 1, `temporada fuera de rango: ${season}`);
}

/** The maximum possible points in a race (2014's double points + fastest lap, with a margin). */
const MAX_POINTS_PER_RACE = 60;

export function normalizeCircuit(c: JolpicaCircuit): CircuitRow {
  check(Math.abs(c.Location.lat) <= 90 && Math.abs(c.Location.long) <= 180, `coordenadas inválidas: ${c.circuitId}`);
  return {
    id: c.circuitId,
    name: c.circuitName,
    locality: c.Location.locality,
    country: c.Location.country,
    lat: c.Location.lat,
    lng: c.Location.long,
  };
}

export function normalizeDriver(d: JolpicaDriver): DriverRow {
  return {
    id: d.driverId,
    code: d.code ?? null,
    number: d.permanentNumber ?? null,
    givenName: d.givenName,
    familyName: d.familyName,
    dateOfBirth: d.dateOfBirth ?? null,
    nationality: d.nationality ?? null,
  };
}

export function normalizeConstructor(c: JolpicaConstructor): ConstructorRow {
  return { id: c.constructorId, name: c.name, nationality: c.nationality ?? null };
}

const SESSION_FIELDS: [keyof JolpicaScheduleRace, SessionKind][] = [
  ["FirstPractice", "fp1"],
  ["SecondPractice", "fp2"],
  ["ThirdPractice", "fp3"],
  ["SprintQualifying", "sprint_qualifying"],
  ["SprintShootout", "sprint_qualifying"],
  ["Sprint", "sprint"],
  ["Qualifying", "qualifying"],
];

export interface NormalizedSchedule {
  circuits: CircuitRow[];
  races: RaceRow[];
  sessions: SessionRow[];
}

export function normalizeSchedule(races: JolpicaScheduleRace[]): NormalizedSchedule {
  const circuits = new Map<string, CircuitRow>();
  const raceRows: RaceRow[] = [];
  const sessions: SessionRow[] = [];
  const rounds = new Set<string>();

  for (const r of races) {
    checkSeason(r.season);
    check(r.round >= 1 && r.round <= 30, `ronda fuera de rango: ${r.season}/${r.round}`);
    const key = `${r.season}/${r.round}`;
    check(!rounds.has(key), `ronda duplicada: ${key}`);
    rounds.add(key);

    circuits.set(r.Circuit.circuitId, normalizeCircuit(r.Circuit));
    const startsAt = toIsoUtc(r.date, r.time);
    raceRows.push({
      season: r.season,
      round: r.round,
      name: r.raceName,
      circuitId: r.Circuit.circuitId,
      date: r.date,
      startsAt,
      isSprintWeekend: Boolean(r.Sprint),
    });

    for (const [field, kind] of SESSION_FIELDS) {
      const s = r[field] as { date: string; time?: string } | undefined;
      if (s) sessions.push({ season: r.season, round: r.round, kind, date: s.date, startsAt: toIsoUtc(s.date, s.time) });
    }
    sessions.push({ season: r.season, round: r.round, kind: "race", date: r.date, startsAt });
  }

  return { circuits: [...circuits.values()], races: raceRows, sessions };
}

export interface NormalizedResults {
  drivers: DriverRow[];
  constructors: ConstructorRow[];
  results: ResultRow[];
}

function normalizeResultRows(
  season: number,
  round: number,
  kind: ResultKind,
  rows: JolpicaResult[],
  out: NormalizedResults,
  drivers: Map<string, DriverRow>,
  constructors: Map<string, ConstructorRow>,
): void {
  // Position → car number. Until 1957 two drivers sharing a car share a position.
  const seenPositions = new Map<number, number | undefined>();
  const seenDrivers = new Set<string>();
  for (const r of rows) {
    if (r.position !== undefined) {
      check(r.position >= 1 && r.position <= rows.length, `posición fuera de rango: ${season}/${round} ${r.position}`);
      check(
        !seenPositions.has(r.position) || seenPositions.get(r.position) === r.number,
        `posición duplicada: ${season}/${round} ${r.position}`,
      );
      seenPositions.set(r.position, r.number);
    }
    // Until 1957 a car could be shared: the same driver can appear twice.
    const resultKey = `${r.Driver.driverId}/${r.number ?? ""}/${r.Constructor.constructorId}`;
    check(!seenDrivers.has(resultKey), `resultado duplicado: ${season}/${round} ${resultKey}`);
    seenDrivers.add(resultKey);
    check(r.points >= 0 && r.points <= MAX_POINTS_PER_RACE, `puntos fuera de rango: ${season}/${round} ${r.points}`);

    drivers.set(r.Driver.driverId, normalizeDriver(r.Driver));
    constructors.set(r.Constructor.constructorId, normalizeConstructor(r.Constructor));
    out.results.push({
      season,
      round,
      kind,
      driverId: r.Driver.driverId,
      constructorId: r.Constructor.constructorId,
      carNumber: r.number ?? null,
      position: r.position ?? null,
      positionText: r.positionText,
      grid: r.grid ?? null,
      laps: r.laps,
      status: r.status,
      timeText: r.Time?.time ?? null,
      millis: r.Time?.millis ?? null,
      points: r.points,
      fastestLapRank: r.FastestLap?.rank ?? null,
      fastestLapLap: r.FastestLap?.lap ?? null,
      fastestLapTime: r.FastestLap?.Time?.time ?? null,
    });
  }
}

export function normalizeResults(races: JolpicaRaceWithResults[]): NormalizedResults {
  const out: NormalizedResults = { drivers: [], constructors: [], results: [] };
  const drivers = new Map<string, DriverRow>();
  const constructors = new Map<string, ConstructorRow>();
  for (const race of races) {
    checkSeason(race.season);
    if (race.Results) normalizeResultRows(race.season, race.round, "race", race.Results, out, drivers, constructors);
    if (race.SprintResults)
      normalizeResultRows(race.season, race.round, "sprint", race.SprintResults, out, drivers, constructors);
  }
  out.drivers = [...drivers.values()];
  out.constructors = [...constructors.values()];
  return out;
}

export interface NormalizedDriverStandings {
  drivers: DriverRow[];
  constructors: ConstructorRow[];
  standings: DriverStandingRow[];
}

export function normalizeDriverStandings(
  season: number,
  round: number,
  rows: JolpicaDriverStanding[],
): NormalizedDriverStandings {
  checkSeason(season);
  const drivers = new Map<string, DriverRow>();
  const constructors = new Map<string, ConstructorRow>();
  const standings = rows.map((r) => {
    check(r.points >= 0 && r.points <= MAX_POINTS_PER_RACE * round, `puntos fuera de rango: ${r.Driver.driverId}`);
    check(r.wins >= 0 && r.wins <= round, `victorias fuera de rango: ${r.Driver.driverId}`);
    drivers.set(r.Driver.driverId, normalizeDriver(r.Driver));
    for (const c of r.Constructors) constructors.set(c.constructorId, normalizeConstructor(c));
    return {
      season,
      round,
      driverId: r.Driver.driverId,
      position: r.position ?? null,
      positionText: r.positionText,
      points: r.points,
      wins: r.wins,
      constructorIds: r.Constructors.map((c) => c.constructorId),
    };
  });
  return { drivers: [...drivers.values()], constructors: [...constructors.values()], standings };
}

export interface NormalizedConstructorStandings {
  constructors: ConstructorRow[];
  standings: ConstructorStandingRow[];
}

export function normalizeConstructorStandings(
  season: number,
  round: number,
  rows: JolpicaConstructorStanding[],
): NormalizedConstructorStandings {
  checkSeason(season);
  const constructors = new Map<string, ConstructorRow>();
  const standings = rows.map((r) => {
    check(r.points >= 0 && r.points <= MAX_POINTS_PER_RACE * 2 * round, `puntos fuera de rango: ${r.Constructor.constructorId}`);
    constructors.set(r.Constructor.constructorId, normalizeConstructor(r.Constructor));
    return {
      season,
      round,
      constructorId: r.Constructor.constructorId,
      position: r.position ?? null,
      positionText: r.positionText,
      points: r.points,
      wins: r.wins,
    };
  });
  return { constructors: [...constructors.values()], standings };
}

/** "1:22.167" or "22.167" or "40:55.302" → milliseconds. Null if the text is not a time. */
export function parseLapTime(text: string | undefined): number | null {
  if (!text) return null;
  const m = /^(?:(\d+):)?(\d{1,2})\.(\d{1,3})$/.exec(text.trim());
  if (!m) return null;
  const minutes = Number(m[1] ?? 0);
  const ms = Number(m[3]!.padEnd(3, "0"));
  return minutes * 60_000 + Number(m[2]) * 1000 + ms;
}

export interface QualifyingRow {
  season: number;
  round: number;
  driverId: string;
  constructorId: string;
  carNumber: number | null;
  position: number | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface PitStopRow {
  season: number;
  round: number;
  driverId: string;
  stop: number;
  lap: number;
  timeOfDay: string;
  duration: string;
  durationMs: number | null;
}

export interface LapRow {
  season: number;
  round: number;
  driverId: string;
  lap: number;
  position: number | null;
  timeMs: number | null;
}

export function normalizeQualifying(
  season: number,
  round: number,
  rows: JolpicaQualifyingResult[],
): { drivers: DriverRow[]; constructors: ConstructorRow[]; qualifying: QualifyingRow[] } {
  const drivers = new Map<string, DriverRow>();
  const constructors = new Map<string, ConstructorRow>();
  const qualifying = rows.map((r) => {
    if (r.position !== undefined) check(r.position >= 1 && r.position <= rows.length, `posición de clasificación fuera de rango: ${season}/${round}`);
    drivers.set(r.Driver.driverId, normalizeDriver(r.Driver));
    constructors.set(r.Constructor.constructorId, normalizeConstructor(r.Constructor));
    return {
      season,
      round,
      driverId: r.Driver.driverId,
      constructorId: r.Constructor.constructorId,
      carNumber: r.number ?? null,
      position: r.position ?? null,
      q1: r.Q1 || null,
      q2: r.Q2 || null,
      q3: r.Q3 || null,
    };
  });
  return { drivers: [...drivers.values()], constructors: [...constructors.values()], qualifying };
}

export function normalizePitStops(season: number, round: number, rows: JolpicaPitStop[]): PitStopRow[] {
  return rows.map((r) => {
    check(r.lap >= 0 && r.lap <= 200 && r.stop >= 1 && r.stop <= 20, `parada fuera de rango: ${season}/${round}`);
    return {
      season,
      round,
      driverId: r.driverId,
      stop: r.stop,
      lap: r.lap,
      timeOfDay: r.time,
      duration: r.duration,
      durationMs: parseLapTime(r.duration),
    };
  });
}

export function normalizeLaps(season: number, round: number, laps: JolpicaLap[]): LapRow[] {
  return laps.flatMap((lap) => {
    check(lap.number >= 1 && lap.number <= 200, `vuelta fuera de rango: ${season}/${round} ${lap.number}`);
    return lap.Timings.map((t) => ({
      season,
      round,
      driverId: t.driverId,
      lap: lap.number,
      position: t.position ?? null,
      timeMs: parseLapTime(t.time),
    }));
  });
}
