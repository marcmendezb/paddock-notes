import {
  constructorStandingsResponseSchema,
  driverStandingsResponseSchema,
  resultsResponseSchema,
  scheduleResponseSchema,
  type JolpicaLap,
} from "@paddock/shared/jolpica";
import type { Env } from "./env";
import { fetchJson, type FetchContext } from "./http";

/** Jolpica F1 client. Every request goes through the global limiter (D-10). */
export function jolpicaContext(env: Env, options: { backfill?: boolean } = {}): FetchContext {
  return {
    env,
    policy: {
      perSecond: Number(env.JOLPICA_MAX_PER_SECOND),
      // The history backfill leaves room for live ingestion, which shares the same counter.
      perWindow: Number(options.backfill ? env.JOLPICA_BACKFILL_MAX_PER_HOUR : env.JOLPICA_MAX_PER_HOUR),
      windowMs: 3_600_000,
    },
    counter: { requests: 0 },
  };
}

/** Jolpica pages at most 100 rows per request. */
const PAGE = 100;

function url(env: Env, path: string, offset = 0): string {
  return `${env.JOLPICA_BASE_URL}/${path}/?limit=${PAGE}${offset ? `&offset=${offset}` : ""}`;
}

export function createJolpica(ctx: FetchContext) {
  const { env } = ctx;
  const races = async (path: string) =>
    (await fetchJson(ctx, url(env, path), resultsResponseSchema)).MRData.RaceTable.Races;
  const standingsPath = (kind: string, season: number, round?: number) =>
    round === undefined ? `${season}/${kind}` : `${season}/${round}/${kind}`;

  return {
    schedule: async (season: number) =>
      (await fetchJson(ctx, url(env, `${season}/races`), scheduleResponseSchema)).MRData.RaceTable.Races,
    results: (season: number, round: number) => races(`${season}/${round}/results`),
    sprint: (season: number, round: number) => races(`${season}/${round}/sprint`),
    qualifying: (season: number, round: number) => races(`${season}/${round}/qualifying`),
    pitStops: (season: number, round: number) => races(`${season}/${round}/pitstops`),
    driverStandings: async (season: number, round?: number) =>
      (await fetchJson(ctx, url(env, standingsPath("driverstandings", season, round)), driverStandingsResponseSchema))
        .MRData.StandingsTable.StandingsLists,
    constructorStandings: async (season: number, round?: number) =>
      (
        await fetchJson(
          ctx,
          url(env, standingsPath("constructorstandings", season, round)),
          constructorStandingsResponseSchema,
        )
      ).MRData.StandingsTable.StandingsLists,
    /** All of a race's laps, page by page (as Jolpica recommends). */
    laps: async (season: number, round: number): Promise<JolpicaLap[]> => {
      const all: JolpicaLap[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const body = await fetchJson(ctx, url(env, `${season}/${round}/laps`, offset), resultsResponseSchema);
        all.push(...(body.MRData.RaceTable.Races[0]?.Laps ?? []));
        if (offset + PAGE >= body.MRData.total) break;
      }
      return all;
    },
  };
}

export type Jolpica = ReturnType<typeof createJolpica>;
