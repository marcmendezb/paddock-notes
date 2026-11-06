/**
 * Lectura de datos de F1: solo consultas `select`. Es el único módulo de datos que puede importar
 * `paddock-api` (D-14). Devuelve directamente los tipos del contrato de la API.
 */
import { drizzle } from "drizzle-orm/d1";
import { and, asc, desc, eq, inArray, lte, max, sql } from "drizzle-orm";
import {
  gapsToLeader,
  positionsGained,
  roundStatuses,
  type ConstructorRef,
  type ConstructorStandingRow,
  type DriverRef,
  type DriverStandingRow,
  type RaceDetail,
  type RaceResultRow,
  type RaceSummary,
  type ScheduleSession,
  type SessionKind,
  type Standings,
} from "@paddock/shared";
import { createHistoryReader } from "./f1-history";
import * as schema from "./schema";

const { races, circuits, sessions, results, drivers, constructors, standingsDrivers, standingsConstructors, ingestState } =
  schema;

const SESSION_ORDER: SessionKind[] = ["fp1", "fp2", "fp3", "sprint_qualifying", "sprint", "qualifying", "race"];

/** Instante de salida en SQL: hora de la carrera o, si no la hay, final del día. */
const raceInstant = sql<string>`coalesce(${races.startsAt}, ${races.date} || 'T23:59:59.000Z')`;

function driverRef(d: typeof drivers.$inferSelect): DriverRef {
  return { id: d.id, code: d.code, givenName: d.givenName, familyName: d.familyName };
}

function toResultRow(
  r: typeof results.$inferSelect,
  driver: typeof drivers.$inferSelect,
  team: typeof constructors.$inferSelect,
): RaceResultRow {
  return {
    position: r.position,
    positionText: r.positionText,
    driver: driverRef(driver),
    constructor: { id: team.id, name: team.name },
    grid: r.grid,
    positionsGained: positionsGained(r.grid, r.position, r.status),
    laps: r.laps,
    time: r.timeText,
    status: r.status,
    points: r.points,
    fastestLap:
      r.fastestLapRank === null ? null : { rank: r.fastestLapRank, lap: r.fastestLapLap, time: r.fastestLapTime },
  };
}

export function createF1Reader(d1: D1Database) {
  const db = drizzle(d1, { schema });

  async function seasonRaces(season: number) {
    return db
      .select({ race: races, circuit: circuits })
      .from(races)
      .innerJoin(circuits, eq(circuits.id, races.circuitId))
      .where(eq(races.season, season))
      .orderBy(asc(races.round));
  }

  async function winners(season: number, round?: number) {
    const rows = await db
      .select({ round: results.round, driver: drivers })
      .from(results)
      .innerJoin(drivers, eq(drivers.id, results.driverId))
      .where(
        and(
          eq(results.season, season),
          eq(results.kind, "race"),
          eq(results.position, 1),
          round === undefined ? undefined : eq(results.round, round),
        ),
      );
    return new Map(rows.map((r) => [r.round, driverRef(r.driver)]));
  }

  function summaries(
    rows: Awaited<ReturnType<typeof seasonRaces>>,
    winnerByRound: Map<number, DriverRef>,
    sessionsByRound: Map<number, ScheduleSession[]>,
    now: number,
  ): RaceSummary[] {
    const statuses = roundStatuses(
      rows.map(({ race }) => ({
        round: race.round,
        date: race.date,
        startsAt: race.startsAt,
        hasResult: winnerByRound.has(race.round),
        cancelled: race.cancelled,
      })),
      now,
    );
    return rows.map(({ race, circuit }) => ({
      season: race.season,
      round: race.round,
      name: race.name,
      date: race.date,
      startsAt: race.startsAt,
      isSprintWeekend: race.isSprintWeekend,
      circuit: { id: circuit.id, name: circuit.name, locality: circuit.locality, country: circuit.country, lat: circuit.lat, lng: circuit.lng },
      status: statuses.get(race.round) ?? "upcoming",
      winner: winnerByRound.get(race.round) ?? null,
      sessions: sessionsByRound.get(race.round) ?? [],
    }));
  }

  async function seasonSessions(season: number, round?: number) {
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.season, season), round === undefined ? undefined : eq(sessions.round, round)));
    const byRound = new Map<number, ScheduleSession[]>();
    for (const s of rows) {
      const list = byRound.get(s.round) ?? [];
      list.push({ kind: s.kind, startsAt: s.startsAt, date: s.date });
      byRound.set(s.round, list);
    }
    for (const list of byRound.values()) list.sort((a, b) => SESSION_ORDER.indexOf(a.kind) - SESSION_ORDER.indexOf(b.kind));
    return byRound;
  }

  async function getSchedule(season: number, now = Date.now()): Promise<RaceSummary[]> {
    const [rows, winnerByRound, sessionsByRound] = await Promise.all([
      seasonRaces(season),
      winners(season),
      seasonSessions(season),
    ]);
    return summaries(rows, winnerByRound, sessionsByRound, now);
  }

  async function getRace(season: number, round: number, now = Date.now()): Promise<RaceDetail | null> {
    const schedule = await getSchedule(season, now);
    const summary = schedule.find((r) => r.round === round);
    if (!summary) return null;

    const [resultRows] = await Promise.all([
      db
        .select({ result: results, driver: drivers, team: constructors })
        .from(results)
        .innerJoin(drivers, eq(drivers.id, results.driverId))
        .innerJoin(constructors, eq(constructors.id, results.constructorId))
        .where(and(eq(results.season, season), eq(results.round, round), eq(results.kind, "race")))
        .orderBy(sql`${results.position} is null`, asc(results.position), desc(results.laps)),
    ]);

    const resultsOut = resultRows.map(({ result: r, driver, team }) => toResultRow(r, driver, team));

    return { ...summary, results: resultsOut };
  }

  /** Resultado del sprint de una ronda (NUC-25). */
  async function getSprintResults(season: number, round: number): Promise<RaceResultRow[]> {
    const rows = await db
      .select({ result: results, driver: drivers, team: constructors })
      .from(results)
      .innerJoin(drivers, eq(drivers.id, results.driverId))
      .innerJoin(constructors, eq(constructors.id, results.constructorId))
      .where(and(eq(results.season, season), eq(results.round, round), eq(results.kind, "sprint")))
      .orderBy(sql`${results.position} is null`, asc(results.position), desc(results.laps));
    return rows.map(({ result: r, driver, team }) => toResultRow(r, driver, team));
  }

  /** Primer GP no cancelado cuya carrera no ha empezado (NUC-01). */
  async function getNextRace(now = Date.now()): Promise<RaceDetail | null> {
    const [next] = await db
      .select({ season: races.season, round: races.round })
      .from(races)
      .where(and(eq(races.cancelled, false), sql`${raceInstant} > ${new Date(now).toISOString()}`))
      .orderBy(asc(races.season), asc(races.round))
      .limit(1);
    return next ? getRace(next.season, next.round, now) : null;
  }

  /** Última carrera con resultado guardado (NUC-05). */
  async function getLastRace(now = Date.now()): Promise<RaceDetail | null> {
    const [last] = await db
      .select({ season: results.season, round: results.round })
      .from(results)
      .where(and(eq(results.kind, "race"), eq(results.position, 1)))
      .orderBy(desc(results.season), desc(results.round))
      .limit(1);
    return last ? getRace(last.season, last.round, now) : null;
  }

  /** Última ronda con clasificación; con `upTo`, la última hasta esa ronda (NUC-35). */
  async function latestStandingsRound(
    table: typeof standingsDrivers | typeof standingsConstructors,
    season: number,
    upTo?: number,
  ) {
    const [row] = await db
      .select({ round: max(table.round) })
      .from(table)
      .where(and(eq(table.season, season), upTo === undefined ? undefined : lte(table.round, upTo)));
    return row?.round ?? null;
  }

  async function getDriverStandings(season: number, upTo?: number): Promise<Standings<DriverStandingRow> | null> {
    const round = await latestStandingsRound(standingsDrivers, season, upTo);
    if (round === null) return null;

    const [rows, podiumRows] = await Promise.all([
      db
        .select({ standing: standingsDrivers, driver: drivers })
        .from(standingsDrivers)
        .innerJoin(drivers, eq(drivers.id, standingsDrivers.driverId))
        .where(and(eq(standingsDrivers.season, season), eq(standingsDrivers.round, round)))
        .orderBy(sql`${standingsDrivers.position} is null`, asc(standingsDrivers.position)),
      db
        .select({ driverId: results.driverId, podiums: sql<number>`count(*)` })
        .from(results)
        .where(
          and(
            eq(results.season, season),
            eq(results.kind, "race"),
            lte(results.position, 3),
            lte(results.round, round),
          ),
        )
        .groupBy(results.driverId),
    ]);

    const constructorIds = [...new Set(rows.flatMap((r) => r.standing.constructorIds))];
    const constructorRows = constructorIds.length
      ? await db.select().from(constructors).where(inArray(constructors.id, constructorIds))
      : [];
    const constructorById = new Map<string, ConstructorRef>(constructorRows.map((c) => [c.id, { id: c.id, name: c.name }]));
    const podiums = new Map(podiumRows.map((p) => [p.driverId, Number(p.podiums)]));
    const gaps = gapsToLeader(rows.map((r) => r.standing.points));

    return {
      season,
      round,
      rows: rows.map(({ standing, driver }, i) => ({
        position: standing.position,
        driver: driverRef(driver),
        constructors: standing.constructorIds.map((id) => constructorById.get(id) ?? { id, name: id }),
        wins: standing.wins,
        podiums: podiums.get(driver.id) ?? 0,
        points: standing.points,
        gapToLeader: gaps[i] ?? 0,
      })),
    };
  }

  async function getConstructorStandings(season: number, upTo?: number): Promise<Standings<ConstructorStandingRow> | null> {
    const round = await latestStandingsRound(standingsConstructors, season, upTo);
    if (round === null) return null;
    const rows = await db
      .select({ standing: standingsConstructors, team: constructors })
      .from(standingsConstructors)
      .innerJoin(constructors, eq(constructors.id, standingsConstructors.constructorId))
      .where(and(eq(standingsConstructors.season, season), eq(standingsConstructors.round, round)))
      .orderBy(sql`${standingsConstructors.position} is null`, asc(standingsConstructors.position));
    const gaps = gapsToLeader(rows.map((r) => r.standing.points));
    return {
      season,
      round,
      rows: rows.map(({ standing, team }, i) => ({
        position: standing.position,
        constructor: { id: team.id, name: team.name },
        wins: standing.wins,
        points: standing.points,
        gapToLeader: gaps[i] ?? 0,
      })),
    };
  }

  /** Temporada más reciente con calendario cargado. */
  async function latestSeason(): Promise<number | null> {
    const [row] = await db.select({ season: max(races.season) }).from(races);
    return row?.season ?? null;
  }

  /** La más reciente de las fechas de actualización de esos recursos (D-06). */
  async function updatedAt(resources: string[]): Promise<string | null> {
    if (resources.length === 0) return null;
    const [row] = await db
      .select({ updatedAt: max(ingestState.updatedAt) })
      .from(ingestState)
      .where(inArray(ingestState.resource, resources));
    return row?.updatedAt ?? null;
  }

  async function ping(): Promise<void> {
    await db.run(sql`select 1`);
  }

  return {
    ...createHistoryReader(db),
    getSprintResults,
    getSchedule,
    getRace,
    getNextRace,
    getLastRace,
    getDriverStandings,
    getConstructorStandings,
    latestSeason,
    updatedAt,
    ping,
  };
}

export type F1Reader = ReturnType<typeof createF1Reader>;
