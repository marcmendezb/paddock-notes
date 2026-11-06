import "server-only";
import type { AnalysisIndex, PaceData, ReplayData, SectorsData, StrategyData, TelemetryData } from "@paddock/analysis";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  ApiEnvelope,
  CircuitProfile,
  ConstructorProfile,
  ConstructorStandingRow,
  DriverComparison,
  DriverProfile,
  DriverStandingRow,
  HistoryEvent,
  PitStopEntry,
  QualifyingEntry,
  RaceDetail,
  RaceNavigation,
  RaceResultRow,
  RaceSummary,
  RecordEntry,
  RecordType,
  Quiz,
  SearchResult,
  Standings,
  RecalculatedStandings,
  StandingsHistory,
} from "@paddock/shared";

/**
 * Cliente de la API propia. En Cloudflare va por Service Binding, sin salir a internet (D-05).
 * La web nunca llama a Jolpica ni a OpenF1.
 */

export interface Fetched<T> {
  data: T;
  updatedAt: string | null;
  stale: boolean;
}

export class ApiUnavailableError extends Error {
  override name = "ApiUnavailableError";
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  const url = `https://paddock-api.internal/api/v1${path}`;
  if (env.API) return env.API.fetch(new Request(url, { ...init, headers, redirect: "manual" }));
  // Solo en desarrollo, si la API no está enlazada: `wrangler dev` de workers/api.
  const origin = process.env.PADDOCK_API_ORIGIN ?? "http://localhost:8787";
  return fetch(`${origin}/api/v1${path}`, { ...init, headers, redirect: "manual" });
}

/**
 * Petición a la API en nombre del visitante (fase 4): reenvía solo las cookies de sesión propias y,
 * en las escrituras, el origen del sitio y la IP del visitante para el límite de escritura.
 */
export async function userFetch(
  path: string,
  {
    cookie,
    method = "GET",
    body,
    clientIp,
    origin,
    extraHeaders = {},
  }: {
    cookie: string;
    method?: string;
    body?: unknown;
    clientIp?: string | null;
    origin?: string;
    extraHeaders?: Record<string, string>;
  },
): Promise<Response> {
  const sessionCookies = cookie
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("__Host-pn."))
    .join("; ");
  const headers: Record<string, string> = { ...extraHeaders, cookie: sessionCookies };
  if (method !== "GET") {
    headers["x-paddock-origin"] = origin ?? SITE_ORIGIN();
    headers["content-type"] = "application/json";
    if (clientIp) headers["x-paddock-client-ip"] = clientIp;
  }
  return apiFetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const SITE_ORIGIN = () => new URL(process.env.SITE_URL ?? "https://paddocknotes.dev").origin;

async function get<T>(path: string): Promise<Fetched<T> | null> {
  let response: Response;
  try {
    response = await apiFetch(path);
  } catch (error) {
    throw new ApiUnavailableError(String(error));
  }
  // 404: no existe. 400: el identificador no es válido, así que tampoco existe.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new ApiUnavailableError(`API ${response.status} en ${path}`);
  const body = (await response.json()) as ApiEnvelope<T>;
  return { data: body.data, updatedAt: body.updated_at, stale: response.headers.get("x-data-stale") === "true" };
}

export const api = {
  schedule: (season: number | "current") => get<RaceSummary[]>(`/seasons/${season}/schedule`),
  race: (season: number, round: number) => get<RaceDetail>(`/seasons/${season}/races/${round}`),
  nextRace: () => get<RaceDetail>("/races/next"),
  lastRace: () => get<RaceDetail>("/races/last"),
  driverStandings: (season: number | "current") =>
    get<Standings<DriverStandingRow>>(`/seasons/${season}/standings/drivers`),
  constructorStandings: (season: number | "current") =>
    get<Standings<ConstructorStandingRow>>(`/seasons/${season}/standings/constructors`),
  driverStandingsAfter: (season: number, round: number) =>
    get<Standings<DriverStandingRow>>(`/seasons/${season}/rounds/${round}/standings/drivers`),
  constructorStandingsAfter: (season: number, round: number) =>
    get<Standings<ConstructorStandingRow>>(`/seasons/${season}/rounds/${round}/standings/constructors`),
  standingsHistory: (season: number) => get<StandingsHistory>(`/seasons/${season}/standings/history`),
  recalculated: (season: number) => get<RecalculatedStandings>(`/seasons/${season}/standings/recalculated`),
  qualifying: (season: number, round: number) => get<QualifyingEntry[]>(`/seasons/${season}/races/${round}/qualifying`),
  sprint: (season: number, round: number) => get<RaceResultRow[]>(`/seasons/${season}/races/${round}/sprint`),
  pitStops: (season: number, round: number) => get<PitStopEntry[]>(`/seasons/${season}/races/${round}/pitstops`),
  navigation: (season: number, round: number) => get<RaceNavigation>(`/seasons/${season}/races/${round}/navigation`),
  seasons: () => get<number[]>("/seasons"),
  driver: (id: string) => get<DriverProfile>(`/drivers/${encodeURIComponent(id)}`),
  constructorProfile: (id: string) => get<ConstructorProfile>(`/constructors/${encodeURIComponent(id)}`),
  circuit: (id: string) => get<CircuitProfile>(`/circuits/${encodeURIComponent(id)}`),
  circuitLayout: (id: string) =>
    get<{
      points: [number, number][];
      length: number;
      season: number;
      round: number;
      corners: { n: number; at: number; speed: number; gear: number; point: [number, number] }[];
    }>(
      `/circuits/${encodeURIComponent(id)}/layout`,
    ),
  compare: (a: string, b: string) =>
    get<DriverComparison>(`/compare/drivers/${encodeURIComponent(a)}/${encodeURIComponent(b)}`),
  records: (type: RecordType) => get<RecordEntry[]>(`/records/${type}`),
  thisWeek: () => get<HistoryEvent[]>("/history/this-week"),
  search: (q: string) => get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  quiz: (week: string) => get<Quiz>(`/quiz/${week}`),
  rankings: (season: number | "current") =>
    get<{ rank: number; name: string; points: number; exact: number; poles: number }[]>(`/rankings/${season}`),
  analysisList: () =>
    get<{ season: number; round: number; name: string; date: string; tools: string[] }[]>("/analysis"),
  analysisIndex: (season: number, round: number) => get<AnalysisIndex>(`/analysis/${season}/${round}`),
  strategy: (season: number, round: number) => get<StrategyData>(`/analysis/${season}/${round}/strategy`),
  pace: (season: number, round: number) => get<PaceData>(`/analysis/${season}/${round}/pace`),
  sectors: (season: number, round: number) => get<SectorsData>(`/analysis/${season}/${round}/sectors`),
  replay: (season: number, round: number) => get<ReplayData>(`/analysis/${season}/${round}/replay`),
  telemetry: (season: number, round: number, driver: number) =>
    get<TelemetryData>(`/analysis/${season}/${round}/telemetry/${driver}`),
};
