import { changedResultRows, type F1Writer } from "@paddock/db/f1-write";
import { resourceKey } from "@paddock/db/schema";
import {
  normalizeConstructorStandings,
  normalizeDriverStandings,
  normalizeLaps,
  normalizePitStops,
  normalizeQualifying,
  normalizeResults,
  normalizeSchedule,
  type ConstructorRow,
  type DriverRow,
} from "@paddock/shared/jolpica";
import type { Jolpica } from "./jolpica";

/** Primeras temporadas con cada tipo de dato en Jolpica (apis.md §2.1). */
export const COVERAGE = {
  qualifying: 1994,
  laps: 1996,
  pitStops: 2011,
  constructorsChampionship: 1958,
} as const;

const DAY = 86_400_000;
/** Un resultado con más de 30 días se considera consolidado (cuarentena, seguridad.md §8). */
const CONSOLIDATED_AFTER_MS = 30 * DAY;
const QUARANTINE_THRESHOLD = 3;

export class QuarantineError extends Error {
  override name = "QuarantineError";
}

export interface RoundContext {
  jolpica: Jolpica;
  writer: F1Writer;
  now: number;
}

export interface RoundRef {
  season: number;
  round: number;
  isSprintWeekend: boolean;
  date: string;
}

function dedupe<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((r) => [r.id, r])).values()];
}

/** Calendario de una temporada. Devuelve las rondas, para recorrerlas después. */
export async function ingestSchedule(c: RoundContext, season: number): Promise<RoundRef[]> {
  const normalized = normalizeSchedule(await c.jolpica.schedule(season));
  await c.writer.write({ ...normalized, resources: [resourceKey.schedule(season)] }, new Date(c.now));
  return normalized.races.map((r) => ({
    season: r.season,
    round: r.round,
    isSprintWeekend: r.isSprintWeekend,
    date: r.date,
  }));
}

/**
 * Todo lo de una ronda salvo las vueltas: resultado, sprint, clasificación, paradas y las dos
 * clasificaciones del campeonato tras esa ronda. Devuelve las filas escritas (0 si aún no hay resultado).
 */
export async function ingestRound(c: RoundContext, ref: RoundRef): Promise<number> {
  const { season, round } = ref;
  const races = await c.jolpica.results(season, round);
  if (ref.isSprintWeekend) races.push(...(await c.jolpica.sprint(season, round)));
  const results = normalizeResults(races);
  if (results.results.length === 0) return 0;

  if (c.now - Date.parse(`${ref.date}T00:00:00Z`) > CONSOLIDATED_AFTER_MS) {
    const existing = await c.writer.existingResults(season, round);
    const changed = changedResultRows(existing, results.results);
    if (existing.length > 0 && changed > QUARANTINE_THRESHOLD) {
      throw new QuarantineError(`${season}/${round}: cambiarían ${changed} filas de un resultado consolidado`);
    }
  }

  const drivers: DriverRow[] = [...results.drivers];
  const constructors: ConstructorRow[] = [...results.constructors];

  const qualifyingRace =
    season >= COVERAGE.qualifying ? (await c.jolpica.qualifying(season, round))[0] : undefined;
  const qualifying = qualifyingRace?.QualifyingResults
    ? normalizeQualifying(season, round, qualifyingRace.QualifyingResults)
    : null;
  if (qualifying) {
    drivers.push(...qualifying.drivers);
    constructors.push(...qualifying.constructors);
  }

  const pitRace = season >= COVERAGE.pitStops ? (await c.jolpica.pitStops(season, round))[0] : undefined;
  const pitStops = pitRace?.PitStops ? normalizePitStops(season, round, pitRace.PitStops) : [];

  const driverList = (await c.jolpica.driverStandings(season, round))[0];
  const driverStandings = driverList
    ? normalizeDriverStandings(driverList.season, driverList.round, driverList.DriverStandings)
    : null;
  if (driverStandings) {
    drivers.push(...driverStandings.drivers);
    constructors.push(...driverStandings.constructors);
  }

  const constructorList =
    season >= COVERAGE.constructorsChampionship ? (await c.jolpica.constructorStandings(season, round))[0] : undefined;
  const constructorStandings = constructorList
    ? normalizeConstructorStandings(constructorList.season, constructorList.round, constructorList.ConstructorStandings)
    : null;
  if (constructorStandings) constructors.push(...constructorStandings.constructors);

  return c.writer.write(
    {
      drivers: dedupe(drivers),
      constructors: dedupe(constructors),
      results: results.results,
      qualifying: qualifying?.qualifying,
      pitStops,
      driverStandings: driverStandings?.standings,
      constructorStandings: constructorStandings?.standings,
      resources: [resourceKey.results(season, round), resourceKey.standings(season)],
    },
    new Date(c.now),
  );
}

/** Vueltas de una carrera (desde 1996). Suelen ser 12-15 peticiones. */
export async function ingestLaps(c: RoundContext, season: number, round: number): Promise<number> {
  if (season < COVERAGE.laps) return 0;
  const laps = normalizeLaps(season, round, await c.jolpica.laps(season, round));
  if (laps.length === 0) return 0;
  return c.writer.write({ laps, resources: [resourceKey.laps(season, round)] }, new Date(c.now));
}
