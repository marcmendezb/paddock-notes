/**
 * Consultas del histórico (fase 2). Solo lectura: forma parte de `f1-read` (D-14).
 * Las definiciones de cada estadística están aquí y se muestran tal cual en la web (HIS-07).
 */
import { sql, type SQL } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  recalculatePoints,
  driverOption,
  seededRandom,
  shuffle,
  type CareerStats,
  type CircuitProfile,
  type ConstructorProfile,
  type ConstructorRef,
  type DriverComparison,
  type DriverProfile,
  type DriverRef,
  type HistoryEvent,
  type PitStopEntry,
  type QualifyingEntry,
  type Quiz,
  type QuizQuestion,
  type RaceNavigation,
  type RecalculatedStandings,
  type RecordEntry,
  type RecordType,
  type SearchResult,
  type StandingsHistory,
} from "@paddock/shared";
import type * as schema from "./schema";

type Db = DrizzleD1Database<typeof schema>;

/** Inscripciones que no llegaron a tomar la salida: no cuentan como carrera disputada. */
const NOT_STARTED = sql`('Did not qualify', 'Did not prequalify', 'Withdrew', 'Did not start')`;
/** Vio la bandera a cuadros: "Finished", "Lapped" o "+N Laps". */
const FINISHED = (alias: SQL) =>
  sql`(${alias}.status = 'Finished' or ${alias}.status = 'Lapped' or ${alias}.status like '+% Lap%')`;
const R = sql.raw("r");

interface DriverRow {
  id: string;
  code: string | null;
  given_name: string;
  family_name: string;
}

const driverRef = (d: DriverRow): DriverRef => ({
  id: d.id,
  code: d.code,
  givenName: d.given_name,
  familyName: d.family_name,
});

export function createHistoryReader(db: Db) {
  const all = <T>(query: SQL) => db.all<T>(query);

  async function getQualifying(season: number, round: number): Promise<QualifyingEntry[]> {
    const rows = await all<DriverRow & { position: number | null; q1: string | null; q2: string | null; q3: string | null; constructor_id: string; constructor_name: string }>(sql`
      select q.position, q.q1, q.q2, q.q3, d.id, d.code, d.given_name, d.family_name,
             c.id as constructor_id, c.name as constructor_name
      from qualifying q
      join drivers d on d.id = q.driver_id
      join constructors c on c.id = q.constructor_id
      where q.season = ${season} and q.round = ${round}
      order by q.position is null, q.position`);
    return rows.map((r) => ({
      position: r.position,
      driver: driverRef(r),
      constructor: { id: r.constructor_id, name: r.constructor_name },
      q1: r.q1,
      q2: r.q2,
      q3: r.q3,
    }));
  }

  async function getPitStops(season: number, round: number): Promise<PitStopEntry[]> {
    const rows = await all<DriverRow & { stop: number; lap: number; duration: string; duration_ms: number | null }>(sql`
      select p.stop, p.lap, p.duration, p.duration_ms, d.id, d.code, d.given_name, d.family_name
      from pit_stops p join drivers d on d.id = p.driver_id
      where p.season = ${season} and p.round = ${round}
      order by p.lap, p.stop`);
    return rows.map((r) => ({
      driver: driverRef(r),
      stop: r.stop,
      lap: r.lap,
      duration: r.duration,
      durationMs: r.duration_ms,
    }));
  }

  async function getNavigation(season: number, round: number): Promise<RaceNavigation | null> {
    const [current] = await all<{ name: string; date: string }>(
      sql`select name, date from races where season = ${season} and round = ${round}`,
    );
    if (!current) return null;
    const [previous] = await all<{ season: number; round: number; name: string }>(sql`
      select season, round, name from races
      where (season < ${season}) or (season = ${season} and round < ${round})
      order by season desc, round desc limit 1`);
    const [next] = await all<{ season: number; round: number; name: string }>(sql`
      select season, round, name from races
      where (season > ${season}) or (season = ${season} and round > ${round})
      order by season, round limit 1`);
    const otherYears = await all<{ season: number; round: number }>(sql`
      select season, round from races
      where name = ${current.name} and season != ${season}
      order by season desc`);
    return { previous: previous ?? null, next: next ?? null, otherYears };
  }

  async function getStandingsHistory(season: number): Promise<StandingsHistory | null> {
    const rounds = await all<{ round: number; name: string }>(sql`
      select round, name from races
      where season = ${season} and exists (select 1 from standings_drivers s where s.season = races.season and s.round = races.round)
      order by round`);
    if (rounds.length === 0) return null;
    const standings = await all<DriverRow & { round: number; points: number; position: number | null }>(sql`
      select s.round, s.points, s.position, d.id, d.code, d.given_name, d.family_name
      from standings_drivers s join drivers d on d.id = s.driver_id
      where s.season = ${season}`);
    const results = await all<{ round: number; driver_id: string; position_text: string }>(sql`
      select round, driver_id, position_text from results where season = ${season} and kind = 'race'`);

    const index = new Map(rounds.map((r, i) => [r.round, i]));
    const lastRound = rounds.at(-1)!.round;
    const byDriver = new Map<string, StandingsHistory["drivers"][number]>();
    for (const s of standings) {
      let entry = byDriver.get(s.id);
      if (!entry) {
        entry = {
          driver: driverRef(s),
          points: rounds.map(() => null),
          results: rounds.map(() => null),
          finalPosition: null,
        };
        byDriver.set(s.id, entry);
      }
      const i = index.get(s.round);
      if (i !== undefined) entry.points[i] = s.points;
      if (s.round === lastRound) entry.finalPosition = s.position;
    }
    for (const r of results) {
      const i = index.get(r.round);
      const entry = byDriver.get(r.driver_id);
      if (i !== undefined && entry) entry.results[i] = r.position_text;
    }
    const drivers = [...byDriver.values()].sort(
      (a, b) => (a.finalPosition ?? Number.MAX_SAFE_INTEGER) - (b.finalPosition ?? Number.MAX_SAFE_INTEGER),
    );
    return { season, rounds, drivers };
  }

  /** Pilotos de una temporada con el sistema de puntos actual frente a la clasificación real (HIS-06). */
  async function getRecalculatedStandings(season: number): Promise<RecalculatedStandings | null> {
    const results = await all<DriverRow & { kind: "race" | "sprint"; round: number; position: number | null }>(sql`
      select r.kind, r.round, r.position, d.id, d.code, d.given_name, d.family_name
      from results r join drivers d on d.id = r.driver_id
      where r.season = ${season} and r.kind in ('race', 'sprint')`);
    if (results.length === 0) return null;
    const actual = await all<{ driver_id: string; position: number | null; points: number }>(sql`
      select driver_id, position, points from standings_drivers
      where season = ${season} and round = (select max(round) from standings_drivers where season = ${season})`);
    const actualBy = new Map(actual.map((a) => [a.driver_id, a]));
    const drivers = new Map(results.map((r) => [r.id, driverRef(r)]));
    const rows = recalculatePoints(results.map((r) => ({ driverId: r.id, kind: r.kind, position: r.position })));
    const rounds = (kind: string) => new Set(results.filter((r) => r.kind === kind).map((r) => r.round)).size;
    return {
      season,
      races: rounds("race"),
      sprints: rounds("sprint"),
      rows: rows.map((row, i) => ({
        position: i + 1,
        driver: drivers.get(row.driverId)!,
        points: row.points,
        wins: row.finishes[0] ?? 0,
        actualPosition: actualBy.get(row.driverId)?.position ?? null,
        actualPoints: actualBy.get(row.driverId)?.points ?? null,
      })),
    };
  }

  /** Temporadas con calendario cargado, de la más reciente a la más antigua (HIS-09). */
  async function getSeasons(): Promise<number[]> {
    const rows = await all<{ season: number }>(sql`select distinct season from races order by season desc`);
    return rows.map((r) => r.season);
  }

  async function careerStats(where: SQL): Promise<CareerStats> {
    const [s] = await all<{
      races: number;
      wins: number;
      poles: number;
      podiums: number;
      points: number;
      dnfs: number;
      best: number | null;
    }>(sql`
      select
        count(distinct case when r.kind = 'race' and r.status not in ${NOT_STARTED} then r.season * 100 + r.round end) as races,
        count(distinct case when r.kind = 'race' and r.position = 1 then r.season * 100 + r.round end) as wins,
        count(distinct case when r.kind = 'race' and r.grid = 1 then r.season * 100 + r.round end) as poles,
        count(distinct case when r.kind = 'race' and r.position <= 3 then r.season * 100 + r.round end) as podiums,
        coalesce(sum(r.points), 0) as points,
        count(case when r.kind = 'race' and r.status not in ${NOT_STARTED} and not ${FINISHED(R)} then 1 end) as dnfs,
        min(case when r.kind = 'race' then r.position end) as best
      from results r where ${where}`);
    const span = await all<{ season: number; round: number; name: string }>(sql`
      select r.season, r.round, races.name from results r
      join races on races.season = r.season and races.round = r.round
      where ${where} and r.kind = 'race' and r.status not in ${NOT_STARTED}
      order by r.season, r.round`);
    return {
      races: s?.races ?? 0,
      wins: s?.wins ?? 0,
      poles: s?.poles ?? 0,
      podiums: s?.podiums ?? 0,
      points: Math.round((s?.points ?? 0) * 10) / 10,
      dnfs: s?.dnfs ?? 0,
      bestFinish: s?.best ?? null,
      firstRace: span[0] ?? null,
      lastRace: span.at(-1) ?? null,
    };
  }

  /** Posición final de cada temporada: la clasificación tras la última ronda con datos. */
  const FINAL_DRIVERS = sql`
    select s.* from standings_drivers s
    join (select season, max(round) as round from standings_drivers group by season) last
      on last.season = s.season and last.round = s.round`;
  const FINAL_CONSTRUCTORS = sql`
    select s.* from standings_constructors s
    join (select season, max(round) as round from standings_constructors group by season) last
      on last.season = s.season and last.round = s.round`;

  /**
   * Clasificación definitiva: solo si la última ronda con clasificación es la última ronda del calendario.
   * Una temporada en curso o cargada a medias no puede dar un campeón (títulos y quiz).
   */
  const COMPLETE_DRIVERS = sql`
    select f.* from (${FINAL_DRIVERS}) f
    where f.round = (select max(round) from races where races.season = f.season)`;
  const COMPLETE_CONSTRUCTORS = sql`
    select f.* from (${FINAL_CONSTRUCTORS}) f
    where f.round = (select max(round) from races where races.season = f.season)`;

  async function getDriver(id: string): Promise<DriverProfile | null> {
    const [d] = await all<DriverRow & { number: number | null; nationality: string | null; date_of_birth: string | null }>(
      sql`select * from drivers where id = ${id}`,
    );
    if (!d) return null;
    const where = sql`r.driver_id = ${id}`;
    const [stats, seasons, finals, teammates, titles] = await Promise.all([
      careerStats(where),
      all<{ season: number; constructor_id: string; constructor_name: string; points: number; wins: number; races: number }>(sql`
        select r.season, c.id as constructor_id, c.name as constructor_name,
               sum(r.points) as points,
               count(distinct case when r.kind = 'race' and r.position = 1 then r.round end) as wins,
               count(distinct case when r.kind = 'race' and r.status not in ${NOT_STARTED} then r.round end) as races
        from results r join constructors c on c.id = r.constructor_id
        where ${where}
        group by r.season, c.id order by r.season, min(r.round)`),
      all<{ season: number; position: number | null; points: number }>(
        sql`select season, position, points from (${FINAL_DRIVERS}) where driver_id = ${id}`,
      ),
      all<{ races: number; ahead: number }>(sql`
        select count(*) as races, coalesce(sum(case when a.position < b.position then 1 else 0 end), 0) as ahead
        from results a
        join results b on b.season = a.season and b.round = a.round and b.kind = 'race'
          and b.constructor_id = a.constructor_id and b.driver_id != a.driver_id
        where a.driver_id = ${id} and a.kind = 'race'
          and ${FINISHED(sql.raw("a"))} and ${FINISHED(sql.raw("b"))}`),
      all<{ season: number }>(sql`select season from (${COMPLETE_DRIVERS}) where driver_id = ${id} and position = 1`),
    ]);

    const finalBySeason = new Map(finals.map((f) => [f.season, f]));
    const bySeason = new Map<number, DriverProfile["seasons"][number]>();
    for (const row of seasons) {
      const entry = bySeason.get(row.season) ?? {
        season: row.season,
        constructors: [],
        position: finalBySeason.get(row.season)?.position ?? null,
        points: finalBySeason.get(row.season)?.points ?? 0,
        wins: 0,
        races: 0,
      };
      entry.constructors.push({ id: row.constructor_id, name: row.constructor_name });
      entry.wins += row.wins;
      entry.races += row.races;
      bySeason.set(row.season, entry);
    }

    return {
      driver: { ...driverRef(d), number: d.number, nationality: d.nationality, dateOfBirth: d.date_of_birth },
      stats,
      titles: titles.map((t) => t.season),
      seasons: [...bySeason.values()],
      teammates: teammates[0] ?? { races: 0, ahead: 0 },
    };
  }

  async function getConstructor(id: string): Promise<ConstructorProfile | null> {
    const [c] = await all<{ id: string; name: string; nationality: string | null }>(
      sql`select * from constructors where id = ${id}`,
    );
    if (!c) return null;
    const [stats] = await all<ConstructorProfile["stats"]>(sql`
      select
        count(distinct case when r.kind = 'race' then r.season * 100 + r.round end) as races,
        count(distinct case when r.kind = 'race' and r.position = 1 then r.season * 100 + r.round end) as wins,
        count(case when r.kind = 'race' and r.position <= 3 then 1 end) as podiums,
        coalesce(sum(r.points), 0) as points,
        count(distinct case when r.kind = 'race' and r.grid = 1 then r.season * 100 + r.round end) as poles
      from results r where r.constructor_id = ${id}`);
    const [drivers, finals, driverChampions, titles] = await Promise.all([
      all<DriverRow & { season: number; wins: number }>(sql`
        select r.season, d.id, d.code, d.given_name, d.family_name,
               count(case when r.kind = 'race' and r.position = 1 then 1 end) as wins
        from results r join drivers d on d.id = r.driver_id
        where r.constructor_id = ${id}
        group by r.season, d.id order by r.season, min(r.round)`),
      all<{ season: number; position: number | null; points: number }>(
        sql`select season, position, points from (${FINAL_CONSTRUCTORS}) where constructor_id = ${id}`,
      ),
      all<DriverRow & { season: number }>(sql`
        select f.season, d.id, d.code, d.given_name, d.family_name
        from (${COMPLETE_DRIVERS}) f join drivers d on d.id = f.driver_id
        where f.position = 1 and exists (
          select 1 from results r where r.season = f.season and r.driver_id = f.driver_id and r.constructor_id = ${id}
        )
        order by f.season`),
      all<{ season: number }>(sql`select season from (${COMPLETE_CONSTRUCTORS}) where constructor_id = ${id} and position = 1`),
    ]);
    const finalBySeason = new Map(finals.map((f) => [f.season, f]));
    const seasons = new Map<number, ConstructorProfile["seasons"][number]>();
    for (const row of drivers) {
      const entry = seasons.get(row.season) ?? {
        season: row.season,
        drivers: [],
        position: finalBySeason.get(row.season)?.position ?? null,
        points: finalBySeason.get(row.season)?.points ?? null,
        wins: 0,
      };
      entry.drivers.push(driverRef(row));
      entry.wins += row.wins;
      seasons.set(row.season, entry);
    }
    return {
      constructor: c,
      stats: { ...stats!, points: Math.round(stats!.points * 10) / 10 },
      titles: titles.map((t) => t.season),
      driverTitles: driverChampions.map((d) => ({ season: d.season, driver: driverRef(d) })),
      seasons: [...seasons.values()],
    };
  }

  async function getCircuit(id: string): Promise<CircuitProfile | null> {
    const [c] = await all<{ id: string; name: string; locality: string; country: string; lat: number; lng: number }>(
      sql`select * from circuits where id = ${id}`,
    );
    if (!c) return null;
    const races = await all<
      Partial<DriverRow> & { season: number; round: number; name: string; date: string; constructor_id: string | null; constructor_name: string | null }
    >(sql`
      select races.season, races.round, races.name, races.date,
             d.id, d.code, d.given_name, d.family_name, c.id as constructor_id, c.name as constructor_name
      from races
      left join results r on r.season = races.season and r.round = races.round and r.kind = 'race' and r.position = 1
      left join drivers d on d.id = r.driver_id
      left join constructors c on c.id = r.constructor_id
      where races.circuit_id = ${id}
      order by races.season desc`);
    const [laps] = await all<{ season: number; laps: number }>(sql`
      select r.season, r.laps from results r join races on races.season = r.season and races.round = r.round
      where races.circuit_id = ${id} and r.kind = 'race' and r.position = 1
      order by r.season desc, r.round desc limit 1`);
    const fastest = await all<DriverRow & { season: number; time: string }>(sql`
      select r.season, r.fastest_lap_time as time, d.id, d.code, d.given_name, d.family_name
      from results r join races on races.season = r.season and races.round = r.round join drivers d on d.id = r.driver_id
      where races.circuit_id = ${id} and r.kind = 'race' and r.fastest_lap_rank = 1 and r.fastest_lap_time is not null`);
    const seconds = (t: string) => t.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
    const best = fastest.filter((f) => /^\d+:\d{2}\.\d{3}$/.test(f.time)).sort((a, b) => seconds(a.time) - seconds(b.time))[0];
    return {
      facts: {
        laps: laps ?? null,
        fastestRaceLap: best ? { time: best.time, season: best.season, driver: driverRef(best) } : null,
      },
      circuit: c,
      races: races.map((r) => ({
        season: r.season,
        round: r.round,
        name: r.name,
        date: r.date,
        winner: r.id ? driverRef(r as DriverRow) : null,
        constructor: r.constructor_id ? { id: r.constructor_id, name: r.constructor_name! } : null,
      })),
    };
  }

  async function compareDrivers(a: string, b: string): Promise<DriverComparison | null> {
    const [pa, pb] = await Promise.all([getDriver(a), getDriver(b)]);
    if (!pa || !pb) return null;
    const races = await all<{ season: number; round: number; name: string; a: number; b: number }>(sql`
      select ra.season, ra.round, races.name, ra.position as a, rb.position as b
      from results ra
      join results rb on rb.season = ra.season and rb.round = ra.round and rb.kind = 'race' and rb.driver_id = ${b}
      join races on races.season = ra.season and races.round = ra.round
      where ra.driver_id = ${a} and ra.kind = 'race'
        and ${FINISHED(sql.raw("ra"))} and ${FINISHED(sql.raw("rb"))}
      order by ra.season, ra.round`);
    return {
      a: pa,
      b: pb,
      headToHead: {
        races,
        aAhead: races.filter((r) => r.a < r.b).length,
        bAhead: races.filter((r) => r.b < r.a).length,
      },
    };
  }

  const RECORD_QUERIES: Record<Exclude<RecordType, "win-streak" | "comebacks">, SQL> = {
    wins: sql`count(distinct case when r.kind = 'race' and r.position = 1 then r.season * 100 + r.round end)`,
    poles: sql`count(distinct case when r.kind = 'race' and r.grid = 1 then r.season * 100 + r.round end)`,
    podiums: sql`count(distinct case when r.kind = 'race' and r.position <= 3 then r.season * 100 + r.round end)`,
    points: sql`sum(r.points)`,
    starts: sql`count(distinct case when r.kind = 'race' and r.status not in ${NOT_STARTED} then r.season * 100 + r.round end)`,
    dnfs: sql`count(case when r.kind = 'race' and r.status not in ${NOT_STARTED} and not ${FINISHED(R)} then 1 end)`,
  };

  async function getRecords(type: RecordType, limit = 20): Promise<RecordEntry[]> {
    if (type === "comebacks") {
      // Mayor remontada: posiciones ganadas entre la parrilla y la meta. No cuenta a quien salió desde boxes.
      const rows = await all<DriverRow & { value: number; season: number; name: string }>(sql`
        select r.grid - r.position as value, r.season, races.name, d.id, d.code, d.given_name, d.family_name
        from results r
        join drivers d on d.id = r.driver_id
        join races on races.season = r.season and races.round = r.round
        where r.kind = 'race' and r.grid > 0 and r.position is not null and ${FINISHED(R)}
        order by value desc, r.season limit ${limit}`);
      return rows.map((r, i) => ({ rank: i + 1, driver: driverRef(r), value: r.value, detail: `${r.season} · ${r.name}` }));
    }
    if (type === "win-streak") return winStreaks(limit);
    const rows = await all<DriverRow & { value: number }>(sql`
      select ${RECORD_QUERIES[type]} as value, d.id, d.code, d.given_name, d.family_name
      from results r join drivers d on d.id = r.driver_id
      group by d.id having value > 0
      order by value desc limit ${limit}`);
    return rankRows(rows.map((r) => ({ driver: driverRef(r), value: Math.round(r.value * 10) / 10, detail: null })));
  }

  /** Mayor racha de victorias consecutivas: carreras seguidas del campeonato ganadas por el mismo piloto. */
  async function winStreaks(limit: number): Promise<RecordEntry[]> {
    const rows = await all<DriverRow & { season: number; round: number }>(sql`
      select races.season, races.round, d.id, d.code, d.given_name, d.family_name
      from races
      left join results r on r.season = races.season and r.round = races.round and r.kind = 'race' and r.position = 1
      left join drivers d on d.id = r.driver_id
      order by races.season, races.round`);
    const streaks: { driver: DriverRef; value: number; detail: string }[] = [];
    let current: { id: string; driver: DriverRef; count: number; from: string; to: string } | null = null;
    const close = () => {
      if (current && current.count > 1) {
        streaks.push({ driver: current.driver, value: current.count, detail: `${current.from} – ${current.to}` });
      }
    };
    for (const row of rows) {
      const label = `${row.season}/${row.round}`;
      if (row.id && current?.id === row.id) {
        current.count++;
        current.to = label;
      } else {
        close();
        current = row.id ? { id: row.id, driver: driverRef(row), count: 1, from: label, to: label } : null;
      }
    }
    close();
    streaks.sort((x, y) => y.value - x.value);
    return rankRows(streaks.slice(0, limit));
  }

  /** Posición en el ranking; los empates comparten posición. */
  function rankRows(rows: Omit<RecordEntry, "rank">[]): RecordEntry[] {
    let rank = 0;
    return rows.map((r, i) => {
      if (i === 0 || rows[i - 1]!.value !== r.value) rank = i + 1;
      return { ...r, rank };
    });
  }

  async function search(query: string, limit = 20): Promise<SearchResult[]> {
    const q = `%${query.trim().toLowerCase().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const [drivers, constructors, circuits] = await Promise.all([
      all<DriverRow & { nationality: string | null; last: number | null }>(sql`
        select d.id, d.code, d.given_name, d.family_name, d.nationality,
               (select max(season) from results r where r.driver_id = d.id) as last
        from drivers d
        where lower(d.given_name || ' ' || d.family_name) like ${q} escape '\\' or lower(d.code) like ${q} escape '\\'
        order by last desc limit ${limit}`),
      all<{ id: string; name: string; nationality: string | null }>(sql`
        select id, name, nationality from constructors where lower(name) like ${q} escape '\\' limit ${limit}`),
      all<{ id: string; name: string; locality: string; country: string }>(sql`
        select id, name, locality, country from circuits
        where lower(name) like ${q} escape '\\' or lower(locality) like ${q} escape '\\' or lower(country) like ${q} escape '\\'
        limit ${limit}`),
    ]);
    return [
      ...drivers.map((d) => ({
        kind: "driver" as const,
        id: d.id,
        label: `${d.given_name} ${d.family_name}`,
        detail: d.last ? String(d.last) : null,
      })),
      ...constructors.map((c) => ({ kind: "constructor" as const, id: c.id, label: c.name, detail: c.nationality })),
      ...circuits.map((c) => ({ kind: "circuit" as const, id: c.id, label: c.name, detail: `${c.locality}, ${c.country}` })),
    ].slice(0, limit);
  }

  /** Carreras de temporadas anteriores disputadas esta semana: del día −3 al +3 (HIS-08). */
  async function getThisWeek(now = Date.now(), limit = 12): Promise<HistoryEvent[]> {
    const today = new Date(now);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() + (i - 3) * 86_400_000);
      return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    const rows = await all<
      Partial<DriverRow> & { season: number; round: number; name: string; date: string; constructor_id: string | null; constructor_name: string | null }
    >(sql`
      select races.season, races.round, races.name, races.date,
             d.id, d.code, d.given_name, d.family_name, c.id as constructor_id, c.name as constructor_name
      from races
      join results r on r.season = races.season and r.round = races.round and r.kind = 'race' and r.position = 1
      join drivers d on d.id = r.driver_id
      join constructors c on c.id = r.constructor_id
      where substr(races.date, 6, 5) in (${sql.join(days.map((d) => sql`${d}`), sql`, `)})
        and races.season < ${today.getUTCFullYear()}
      order by races.season desc limit ${limit}`);
    return rows.map((r) => ({
      season: r.season,
      round: r.round,
      name: r.name,
      date: r.date,
      winner: r.id ? driverRef(r as DriverRow) : null,
      constructor: r.constructor_id ? ({ id: r.constructor_id, name: r.constructor_name! } as ConstructorRef) : null,
    }));
  }

  /** Índice de análisis de una carrera (fase 3). */
  async function getAnalysis(season: number, round: number) {
    const [row] = await all<{ season: number; round: number; version: number; session_key: number; tools: string; telemetry_drivers: string; weather: string | null; created_at: string }>(
      sql`select * from analysis_artifacts where season = ${season} and round = ${round}`,
    );
    return row
      ? {
          season: row.season,
          round: row.round,
          version: row.version,
          sessionKey: row.session_key,
          tools: JSON.parse(row.tools) as string[],
          telemetryDrivers: JSON.parse(row.telemetry_drivers) as number[],
          weather: row.weather ? (JSON.parse(row.weather) as { air: [number, number] | null; track: [number, number] | null; rain: boolean }) : null,
          createdAt: row.created_at,
        }
      : null;
  }

  /** Último análisis de una carrera en ese circuito: de su telemetría sale el trazado (D-09). */
  async function latestAnalysisAtCircuit(circuitId: string) {
    const [row] = await all<{ season: number; round: number; version: number; telemetry_drivers: string; created_at: string }>(sql`
      select a.season, a.round, a.version, a.telemetry_drivers, a.created_at from analysis_artifacts a
      join races on races.season = a.season and races.round = a.round
      where races.circuit_id = ${circuitId}
      order by a.season desc, a.round desc limit 1`);
    return row ? { ...row, createdAt: row.created_at, telemetryDrivers: JSON.parse(row.telemetry_drivers) as number[] } : null;
  }

  /** Últimas carreras analizadas, de la más reciente a la más antigua (TEC-01). */
  async function listAnalyses(limit = 30) {
    return all<{ season: number; round: number; name: string; date: string; tools: string }>(sql`
      select a.season, a.round, races.name, races.date, a.tools
      from analysis_artifacts a join races on races.season = a.season and races.round = a.round
      order by a.season desc, a.round desc limit ${limit}`).then((rows) =>
      rows.map((r) => ({ ...r, tools: JSON.parse(r.tools) as string[] })),
    );
  }

  /** Carreras disputadas desde `fromSeason` que aún no tienen análisis, de la más reciente a la más antigua. */
  /** Carreras sin análisis o con uno de una versión anterior a `version` (se vuelven a analizar). */
  async function racesWithoutAnalysis(fromSeason: number, beforeIso: string, limit = 5, version = 0) {
    return all<{ season: number; round: number; starts_at: string | null; date: string }>(sql`
      select races.season, races.round, races.starts_at, races.date from races
      where races.season >= ${fromSeason}
        and coalesce(races.starts_at, races.date || 'T23:59:59.000Z') < ${beforeIso}
        and not exists (select 1 from analysis_artifacts a where a.season = races.season and a.round = races.round and a.version >= ${version})
        and exists (select 1 from results r where r.season = races.season and r.round = races.round and r.kind = 'race')
      order by races.season desc, races.round desc limit ${limit}`);
  }

  /**
   * Quiz de la semana (COM-08): cinco preguntas con datos reales, iguales para todos durante la semana.
   * Solo usa temporadas cerradas o carreras ya disputadas.
   */
  async function getQuiz(week: string): Promise<Quiz> {
    const random = seededRandom(week);
    const pick = <T,>(items: T[]): T | undefined => items[Math.floor(random() * items.length)];
    const questions: QuizQuestion[] = [];
    const racesWithPodium = await all<{ season: number; round: number; name: string }>(sql`
      select distinct r.season, r.round, races.name from results r
      join races on races.season = r.season and races.round = r.round
      where r.kind = 'race' and r.position = 4 order by r.season, r.round`);
    const race = pick(racesWithPodium);
    if (race) {
      const rows = await all<DriverRow & { position: number }>(sql`
        select r.position, d.id, d.code, d.given_name, d.family_name from results r join drivers d on d.id = r.driver_id
        where r.season = ${race.season} and r.round = ${race.round} and r.kind = 'race' and r.position <= 4
        order by r.position`);
      if (rows.length === 4) {
        questions.push({
          id: "q1",
          kind: "race-winner",
          season: race.season,
          subject: race.name,
          options: shuffle(rows.map((r) => driverOption(driverRef(r))), random),
          answer: rows[0]!.id,
          detail: null,
          race: { season: race.season, round: race.round },
        });
      }
    }

    const finals = await all<DriverRow & { season: number; position: number; points: number }>(sql`
      select f.season, f.position, f.points, d.id, d.code, d.given_name, d.family_name
      from (${COMPLETE_DRIVERS}) f join drivers d on d.id = f.driver_id
      where f.position <= 4 order by f.season, f.position`);
    const championSeason = pick([...new Set(finals.map((f) => f.season))]);
    const top = finals.filter((f) => f.season === championSeason);
    if (championSeason && top.length === 4) {
      questions.push({
        id: "q2",
        kind: "champion",
        season: championSeason,
        subject: null,
        options: shuffle(top.map((r) => driverOption(driverRef(r))), random),
        answer: top[0]!.id,
        detail: String(top[0]!.points),
      });
    }

    const constructorFinals = await all<{ season: number; position: number; id: string; name: string }>(sql`
      select f.season, f.position, c.id, c.name from (${COMPLETE_CONSTRUCTORS}) f join constructors c on c.id = f.constructor_id
      where f.position <= 4 order by f.season, f.position`);
    const cSeason = pick([...new Set(constructorFinals.map((f) => f.season))]);
    const cTop = constructorFinals.filter((f) => f.season === cSeason);
    if (cSeason && cTop.length === 4) {
      questions.push({
        id: "q3",
        kind: "constructor-champion",
        season: cSeason,
        subject: null,
        options: shuffle(cTop.map((c) => ({ id: c.id, label: c.name })), random),
        answer: cTop[0]!.id,
        detail: null,
      });
    }

    const winners = await all<DriverRow & { season: number; wins: number }>(sql`
      select r.season, count(*) as wins, d.id, d.code, d.given_name, d.family_name
      from results r join drivers d on d.id = r.driver_id
      where r.kind = 'race' and r.position = 1 and r.season in (select season from (${COMPLETE_DRIVERS}))
      group by r.season, d.id having wins >= 2 order by r.season, d.id`);
    const w = pick(winners);
    if (w) {
      const values = [...new Set([w.wins, w.wins + 1, w.wins + 2, Math.max(1, w.wins - 1), w.wins + 3])].slice(0, 4);
      questions.push({
        id: "q4",
        kind: "season-wins",
        season: w.season,
        subject: `${w.given_name} ${w.family_name}`,
        options: shuffle(values, random).map((n) => ({ id: String(n), label: String(n) })),
        answer: String(w.wins),
        detail: null,
      });
    }

    const qualified = await all<{ season: number; round: number; name: string }>(sql`
      select distinct q.season, q.round, races.name from qualifying q
      join races on races.season = q.season and races.round = q.round
      where q.position = 4 order by q.season, q.round`);
    const qr = pick(qualified);
    if (qr) {
      const rows = await all<DriverRow & { position: number }>(sql`
        select q.position, d.id, d.code, d.given_name, d.family_name from qualifying q join drivers d on d.id = q.driver_id
        where q.season = ${qr.season} and q.round = ${qr.round} and q.position <= 4 order by q.position`);
      if (rows.length === 4) {
        questions.push({
          id: "q5",
          kind: "pole",
          season: qr.season,
          subject: qr.name,
          options: shuffle(rows.map((r) => driverOption(driverRef(r))), random),
          answer: rows[0]!.id,
          detail: null,
          race: { season: qr.season, round: qr.round },
        });
      }
    }
    return { week, questions };
  }

  return {
    latestAnalysisAtCircuit,
    getQuiz,
    getAnalysis,
    listAnalyses,
    racesWithoutAnalysis,
    getQualifying,
    getPitStops,
    getNavigation,
    getStandingsHistory,
    getRecalculatedStandings,
    getSeasons,
    getDriver,
    getConstructor,
    getCircuit,
    compareDrivers,
    getRecords,
    search,
    getThisWeek,
  };
}
