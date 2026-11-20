/**
 * F1 data reads: `select` queries only. The only data module `paddock-api` may import (D-14). It returns
 * the API contract's types directly.
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

/** Start time in SQL: the race time or, failing that, the end of the day. */
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
    if (resultsOut.length) return { ...summary, results: resultsOut };

    // No official result yet: OpenF1's provisional one, marked as such (D-31).
    const provisional = await provisionalRows(season, round);
    return provisional.length ? { ...summary, results: provisional, provisional: true } : { ...summary, results: [] };
  }

  async function provisionalRows(season: number, round: number): Promise<RaceResultRow[]> {
    const p = schema.provisionalResults;
    const rows = await db
      .select({ result: p, driver: drivers, team: constructors })
      .from(p)
      .innerJoin(drivers, eq(drivers.id, p.driverId))
      .innerJoin(constructors, eq(constructors.id, p.constructorId))
      .where(and(eq(p.season, season), eq(p.round, round)))
      .orderBy(sql`${p.position} is null`, asc(p.position), desc(p.laps));
    return rows.map(({ result: r, driver, team }) => ({
      position: r.position,
      positionText: r.positionText,
      driver: driverRef(driver),
      constructor: { id: team.id, name: team.name },
      grid: null,
      positionsGained: null,
      laps: r.laps,
      time: r.timeText,
      status: r.status,
      points: r.points,
      fastestLap: null,
    }));
  }

  /**
   * The season's grid, to match OpenF1's drivers (by their three-letter code) with Jolpica's: each driver
   * with a code and their team in the last race they ran (D-31).
   */
  async function seasonLineup(season: number): Promise<{ driverId: string; code: string; constructorId: string }[]> {
    const rows = await db
      .select({ driverId: results.driverId, constructorId: results.constructorId, round: results.round, code: drivers.code })
      .from(results)
      .innerJoin(drivers, eq(drivers.id, results.driverId))
      .where(and(eq(results.season, season), eq(results.kind, "race")))
      .orderBy(asc(results.round));
    const latest = new Map<string, { driverId: string; code: string; constructorId: string }>();
    for (const r of rows) if (r.code) latest.set(r.driverId, { driverId: r.driverId, code: r.code, constructorId: r.constructorId });
    return [...latest.values()];
  }

  /** Does the race have its official result yet? */
  async function hasRaceResult(season: number, round: number): Promise<boolean> {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(results)
      .where(and(eq(results.season, season), eq(results.round, round), eq(results.kind, "race")));
    return (row?.n ?? 0) > 0;
  }

  /** A round's sprint result (NUC-25). */
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

  /** The first non-cancelled Grand Prix whose race has not started (NUC-01). */
  async function getNextRace(now = Date.now()): Promise<RaceDetail | null> {
    const [next] = await db
      .select({ season: races.season, round: races.round })
      .from(races)
      .where(and(eq(races.cancelled, false), sql`${raceInstant} > ${new Date(now).toISOString()}`))
      .orderBy(asc(races.season), asc(races.round))
      .limit(1);
    return next ? getRace(next.season, next.round, now) : null;
  }

  /** The last race with a stored result (NUC-05); if the latest only has the provisional one, that one (D-31). */
  async function getLastRace(now = Date.now()): Promise<RaceDetail | null> {
    const p = schema.provisionalResults;
    const [[last], [prov]] = await Promise.all([
      db
        .select({ season: results.season, round: results.round })
        .from(results)
        .where(and(eq(results.kind, "race"), eq(results.position, 1)))
        .orderBy(desc(results.season), desc(results.round))
        .limit(1),
      db
        .select({ season: p.season, round: p.round })
        .from(p)
        .where(eq(p.position, 1))
        .orderBy(desc(p.season), desc(p.round))
        .limit(1),
    ]);
    const newer = prov && (!last || prov.season > last.season || (prov.season === last.season && prov.round > last.round));
    const pick = newer ? prov : last;
    return pick ? getRace(pick.season, pick.round, now) : null;
  }

  /** The last round with standings; with `upTo`, the last up to that round (NUC-35). */
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

  /** The most recent season with a calendar loaded. */
  async function latestSeason(): Promise<number | null> {
    const [row] = await db.select({ season: max(races.season) }).from(races);
    return row?.season ?? null;
  }

  /** The most recent of those resources' update dates (D-06). */
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
    seasonLineup,
    hasRaceResult,
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
