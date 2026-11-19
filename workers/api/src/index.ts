import { OpenAPIHono, z, type RouteConfig } from "@hono/zod-openapi";
import type { Context } from "hono";
import { createCommunity } from "@paddock/db/community";
import { createF1Reader, type F1Reader } from "@paddock/db/f1-read";
import { resourceKey } from "@paddock/db/schema";
import { analysisKey, circuitLayout, CORNERS_VERSION, type TelemetryData } from "@paddock/analysis";
import { DATA_LICENSE, FIRST_SEASON, SOURCE_JOLPICA, SOURCE_OPENF1, isResultOverdue, type RaceSummary } from "@paddock/shared";
import { cached } from "./cache";
import { mountCommunity } from "./community-routes";
import { mountMailing } from "./mailing-routes";
import type { AppEnv } from "./env";
import { HttpError, errorResponse } from "./errors";
import { noQueryParams, publicCors, rateLimit, readOnlyMethods, requestLog, securityHeaders } from "./middleware";

const DAY = 86_400;

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return errorResponse(c, "invalid_parameter", "Invalid parameter.");
  },
}).basePath("/api/v1");

app.use("*", requestLog, securityHeaders, publicCors, readOnlyMethods);

app.onError((error, c) => {
  if (error instanceof HttpError) return errorResponse(c, error.code, error.message, error.retryAfter);
  console.error(JSON.stringify({ event: "unhandled_error", error: String(error) }));
  return errorResponse(c, "internal_error", "An internal server error occurred.");
});
app.notFound((c) => errorResponse(c, "not_found", "Route not found."));

/**
 * Registra una ruta GET en Hono y en el documento OpenAPI. Los parámetros de ruta se validan con el
 * esquema de la ruta; si no lo cumplen, 400 con el formato uniforme.
 */
function get(
  config: RouteConfig,
  handler: (c: Context<AppEnv>, params: Record<string, string>) => Promise<Response>,
): void {
  app.openAPIRegistry.registerPath(config);
  const schema = config.request?.params as z.ZodType<Record<string, string>> | undefined;
  app.get(config.path.replace(/\{(\w+)\}/g, ":$1"), async (c) => {
    const parsed = schema ? schema.safeParse(c.req.param()) : { success: true as const, data: {} };
    if (!parsed.success) return errorResponse(c, "invalid_parameter", "Invalid parameter.");
    return handler(c, parsed.data);
  });
}

// ---- Parámetros -----------------------------------------------------------------------------

const seasonParam = z
  .string()
  .regex(/^(current|\d{4})$/)
  .openapi({ param: { name: "season", in: "path" }, example: "2026", description: "Año o `current`" });
const roundParam = z
  .string()
  .regex(/^\d{1,2}$/)
  .openapi({ param: { name: "round", in: "path" }, example: "1" });

const envelope = z
  .object({
    data: z.unknown(),
    source: z.array(z.string()),
    license: z.string(),
    updated_at: z.string().nullable(),
  })
  .openapi("Envelope");
const apiError = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .openapi("Error");

const ok = (description: string) => ({
  200: { description, content: { "application/json": { schema: envelope } } },
  400: { description: "Invalid parameter", content: { "application/json": { schema: apiError } } },
  404: { description: "Not found", content: { "application/json": { schema: apiError } } },
  429: { description: "Rate limit exceeded", content: { "application/json": { schema: apiError } } },
  503: { description: "Database unavailable", content: { "application/json": { schema: apiError } } },
});

// ---- Utilidades -----------------------------------------------------------------------------

const currentYear = () => new Date().getUTCFullYear();

async function resolveSeason(reader: F1Reader, raw: string): Promise<number> {
  if (raw === "current") {
    const latest = await reader.latestSeason();
    if (latest === null) throw new HttpError("not_found", "No season loaded yet.");
    return Math.min(latest, currentYear());
  }
  const season = Number(raw);
  if (season < FIRST_SEASON || season > currentYear() + 1) {
    throw new HttpError("invalid_parameter", `Season must be between ${FIRST_SEASON} and ${currentYear() + 1}.`);
  }
  return season;
}

const seasonTtl = (season: number) => (season >= currentYear() ? 60 : DAY);

const overdue = (r: RaceSummary, now: number) =>
  isResultOverdue({ ...r, hasResult: r.winner !== null, cancelled: r.status === "cancelled" }, now);

function seasonResources(season: number): string[] {
  return [resourceKey.schedule(season), ...Array.from({ length: 30 }, (_, i) => resourceKey.results(season, i + 1))];
}

const reader = (c: { env: AppEnv["Bindings"] }) => createF1Reader(c.env.DB);

// ---- Rutas ----------------------------------------------------------------------------------

get(
  { method: "get", path: "/health", responses: { 200: { description: "Servicio operativo" } } },
  async (c) => {
    try {
      await reader(c).ping();
      return c.json({ status: "ok" }, 200, { "cache-control": "no-store" });
    } catch {
      return errorResponse(c, "unavailable", "Database is not responding.", 30);
    }
  },
);

app.use("/seasons/*", noQueryParams, rateLimit);
app.use("/races/*", noQueryParams, rateLimit);

get(
  {
    method: "get",
    path: "/seasons/{season}/schedule",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Calendario de la temporada"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    return cached(c, { ttl: seasonTtl(season) }, async () => {
      const now = Date.now();
      const [schedule, updatedAt] = await Promise.all([r.getSchedule(season, now), r.updatedAt(seasonResources(season))]);
      if (schedule.length === 0) return null;
      return { data: schedule, updatedAt, stale: schedule.some((race) => overdue(race, now)) };
    });
  },
);

get(
  {
    method: "get",
    path: "/seasons/{season}/races/{round}",
    request: { params: z.object({ season: seasonParam, round: roundParam }) },
    responses: ok("Carrera con sesiones y resultado"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    const round = Number(params.round);
    // Temporadas pasadas: 24 h. Temporada en curso: 5 min, para recoger sanciones posteriores.
    return cached(c, { ttl: season < currentYear() ? DAY : 300 }, async () => {
      const race = await r.getRace(season, round);
      if (!race) return null;
      return {
        data: race,
        updatedAt: await r.updatedAt([resourceKey.schedule(season), resourceKey.results(season, round)]),
        stale: overdue(race, Date.now()),
      };
    });
  },
);

get(
  { method: "get", path: "/races/next", responses: ok("Próximo Gran Premio") },
  async (c) =>
    cached(c, { ttl: 60, kvFallback: true }, async () => {
      const r = reader(c);
      const race = await r.getNextRace();
      if (!race) return null;
      return { data: race, updatedAt: await r.updatedAt([resourceKey.schedule(race.season)]) };
    }),
);

get(
  { method: "get", path: "/races/last", responses: ok("Última carrera con resultado") },
  async (c) =>
    cached(c, { ttl: 60, kvFallback: true }, async () => {
      const r = reader(c);
      const race = await r.getLastRace();
      if (!race) return null;
      const schedule = await r.getSchedule(race.season);
      return {
        data: race,
        updatedAt: await r.updatedAt([resourceKey.results(race.season, race.round)]),
        stale: schedule.some((s) => overdue(s, Date.now())),
      };
    }),
);

get(
  {
    method: "get",
    path: "/seasons/{season}/standings/drivers",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Clasificación de pilotos"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    return cached(c, { ttl: seasonTtl(season), kvFallback: season === currentYear() }, async () => {
      const standings = await r.getDriverStandings(season);
      if (!standings) return null;
      return { data: standings, updatedAt: await r.updatedAt([resourceKey.standings(season)]) };
    });
  },
);

get(
  {
    method: "get",
    path: "/seasons/{season}/standings/constructors",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Clasificación de constructores"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    return cached(c, { ttl: seasonTtl(season), kvFallback: season === currentYear() }, async () => {
      const standings = await r.getConstructorStandings(season);
      if (!standings) return null;
      return { data: standings, updatedAt: await r.updatedAt([resourceKey.standings(season)]) };
    });
  },
);


// ---- Fase 2: histórico ------------------------------------------------------------------------

const idParam = (name: string) =>
  z
    .string()
    .regex(/^[a-z0-9_-]{1,64}$/)
    .openapi({ param: { name, in: "path" }, example: "hamilton" });
const recordTypes = ["wins", "poles", "podiums", "points", "starts", "comebacks", "dnfs", "win-streak"] as const;

for (const prefix of ["/drivers", "/drivers/*", "/constructors/*", "/circuits/*", "/compare/*", "/records/*", "/history/*", "/seasons"]) {
  app.use(prefix, noQueryParams, rateLimit);
}
app.use("/search", rateLimit);

/** Respuesta de un perfil o lista del histórico: caché larga y fecha de la última clasificación. */
async function historyPayload<T>(r: F1Reader, data: T | null) {
  if (data === null) return null;
  return { data, updatedAt: await r.updatedAt([resourceKey.standings(currentYear())]) };
}

const raceParams = { params: z.object({ season: seasonParam, round: roundParam }) };

for (const [path, description, load] of [
  ["qualifying", "Clasificación Q1–Q3 (desde 1994)", (r: F1Reader, s: number, n: number) => r.getQualifying(s, n)],
  ["sprint", "Resultado del sprint", (r: F1Reader, s: number, n: number) => r.getSprintResults(s, n)],
  ["pitstops", "Paradas (desde 2011)", (r: F1Reader, s: number, n: number) => r.getPitStops(s, n)],
  ["navigation", "GP anterior, siguiente y el mismo GP en otros años", (r: F1Reader, s: number, n: number) => r.getNavigation(s, n)],
] as const) {
  get(
    { method: "get", path: `/seasons/{season}/races/{round}/${path}`, request: raceParams, responses: ok(description) },
    async (c, params) => {
      const r = reader(c);
      const season = await resolveSeason(r, params.season!);
      const round = Number(params.round);
      return cached(c, { ttl: season < currentYear() ? DAY : 300 }, async () => {
        const data = await load(r, season, round);
        if (data === null || (Array.isArray(data) && data.length === 0)) return null;
        return { data, updatedAt: await r.updatedAt([resourceKey.results(season, round)]) };
      });
    },
  );
}

get(
  {
    method: "get",
    path: "/seasons/{season}/standings/history",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Puntos acumulados por ronda y resultado de cada carrera"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    return cached(c, { ttl: seasonTtl(season) }, async () => {
      const data = await r.getStandingsHistory(season);
      return data && { data, updatedAt: await r.updatedAt([resourceKey.standings(season)]) };
    });
  },
);

get(
  {
    method: "get",
    path: "/seasons/{season}/standings/recalculated",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Pilotos con el sistema de puntos actual frente a la clasificación real (recálculo, HIS-06)"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    return cached(c, { ttl: seasonTtl(season) }, async () => {
      const data = await r.getRecalculatedStandings(season);
      return data && { data, updatedAt: await r.updatedAt([resourceKey.standings(season)]) };
    });
  },
);

for (const kind of ["drivers", "constructors"] as const) {
  get(
    {
      method: "get",
      path: `/seasons/{season}/rounds/{round}/standings/${kind}`,
      request: raceParams,
      responses: ok(`Clasificación de ${kind === "drivers" ? "pilotos" : "constructores"} tras una ronda`),
    },
    async (c, params) => {
      const r = reader(c);
      const season = await resolveSeason(r, params.season!);
      const round = Number(params.round);
      return cached(c, { ttl: seasonTtl(season) }, async () => {
        const data = kind === "drivers" ? await r.getDriverStandings(season, round) : await r.getConstructorStandings(season, round);
        return data && data.round === round ? { data, updatedAt: await r.updatedAt([resourceKey.standings(season)]) } : null;
      });
    },
  );
}

get({ method: "get", path: "/drivers", responses: ok("Pilotos con carreras en los datos cargados") }, async (c) =>
  cached(c, { ttl: 3600 }, async () => {
    const r = reader(c);
    return historyPayload(r, await r.listDrivers());
  }),
);

get({ method: "get", path: "/seasons", responses: ok("Temporadas disponibles") }, async (c) =>
  cached(c, { ttl: 3600 }, async () => {
    const r = reader(c);
    const seasons = await r.getSeasons();
    return seasons.length ? { data: seasons, updatedAt: await r.updatedAt([resourceKey.schedule(currentYear())]) } : null;
  }),
);

for (const [kind, load] of [
  ["drivers", (r: F1Reader, id: string) => r.getDriver(id)],
  ["constructors", (r: F1Reader, id: string) => r.getConstructor(id)],
  ["circuits", (r: F1Reader, id: string) => r.getCircuit(id)],
] as const) {
  get(
    {
      method: "get",
      path: `/${kind}/{id}`,
      request: { params: z.object({ id: idParam("id") }) },
      responses: ok("Ficha"),
    },
    async (c, params) => cached(c, { ttl: DAY }, async () => historyPayload(reader(c), await load(reader(c), params.id!))),
  );
}

get(
  {
    method: "get",
    path: "/compare/drivers/{a}/{b}",
    request: { params: z.object({ a: idParam("a"), b: idParam("b") }) },
    responses: ok("Cara a cara entre dos pilotos"),
  },
  async (c, params) =>
    cached(c, { ttl: DAY }, async () => historyPayload(reader(c), await reader(c).compareDrivers(params.a!, params.b!))),
);

get(
  {
    method: "get",
    path: "/compare/drivers/{a}/{b}/{season}",
    request: { params: z.object({ a: idParam("a"), b: idParam("b"), season: seasonParam }) },
    responses: ok("Cara a cara entre dos pilotos en una temporada"),
  },
  async (c, params) => {
    const r = reader(c);
    const season = await resolveSeason(r, params.season!);
    // La temporada en curso cambia tras cada carrera: 5 minutos, como sus resultados.
    return cached(c, { ttl: season < currentYear() ? DAY : 300 }, async () => historyPayload(r, await r.compareDrivers(params.a!, params.b!, season)));
  },
);

get(
  {
    method: "get",
    path: "/records/{type}",
    request: { params: z.object({ type: z.enum(recordTypes).openapi({ param: { name: "type", in: "path" } }) }) },
    responses: ok("Récord: los 20 primeros"),
  },
  async (c, params) =>
    cached(c, { ttl: 6 * 3600 }, async () =>
      historyPayload(reader(c), await reader(c).getRecords(params.type as (typeof recordTypes)[number])),
    ),
);

get({ method: "get", path: "/history/this-week", responses: ok("Esta semana en la historia") }, async (c) =>
  cached(c, { ttl: 3600 }, async () => historyPayload(reader(c), await reader(c).getThisWeek())),
);

/** Búsqueda (TRA-03). Único parámetro admitido: `q`, de 2 a 50 caracteres. */
get({ method: "get", path: "/search", responses: ok("Pilotos, equipos y circuitos") }, async (c) => {
  const url = new URL(c.req.url);
  const keys = [...url.searchParams.keys()];
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (keys.some((k) => k !== "q") || q.length < 2 || q.length > 50) {
    throw new HttpError("invalid_parameter", "Parameter q must be between 2 and 50 characters.");
  }
  const results = await reader(c).search(q);
  return c.json(
    { data: results, source: [SOURCE_JOLPICA], license: DATA_LICENSE, updated_at: null },
    200,
    { "cache-control": "public, max-age=3600" },
  );
});


// ---- Fase 3: zona técnica -------------------------------------------------------------------

const TOOLS = ["strategy", "pace", "sectors", "replay"] as const;
app.use("/analysis", noQueryParams, rateLimit);
app.use("/analysis/*", noQueryParams, rateLimit);

/** JSON de análisis guardado en R2 por el Workflow POST_RACE (D-08). */
/**
 * Fichero de un análisis en R2, cacheado con la versión y la fecha del análisis en la clave: si la ingesta
 * lo rehace (otra versión de los cálculos), la respuesta nueva se sirve al momento.
 */
async function analysisFile(c: Context<AppEnv>, season: number, round: number, file: string) {
  const index = await reader(c).getAnalysis(season, round);
  if (!index) throw new HttpError("not_found", "No analysis available for this race yet.");
  return cached(c, { ttl: DAY, source: SOURCE_OPENF1, variant: `${index.version}-${index.createdAt}` }, async () => {
    const object = await c.env.ANALYSIS.get(analysisKey(season, round, file, index.version));
    if (!object) return null;
    return { data: await object.json<unknown>(), updatedAt: index.createdAt };
  });
}

get({ method: "get", path: "/analysis", responses: ok("Últimas carreras analizadas") }, async (c) =>
  cached(c, { ttl: 300, source: SOURCE_OPENF1 }, async () => {
    const list = await reader(c).listAnalyses();
    return list.length ? { data: list, updatedAt: null } : null;
  }),
);

get(
  {
    method: "get",
    path: "/analysis/{season}/{round}",
    request: raceParams,
    responses: ok("Herramientas disponibles para una carrera"),
  },
  async (c, params) => {
    const season = await resolveSeason(reader(c), params.season!);
    const round = Number(params.round);
    return cached(c, { ttl: 300, source: SOURCE_OPENF1 }, async () => {
      const index = await reader(c).getAnalysis(season, round);
      return index && { data: index, updatedAt: index.createdAt };
    });
  },
);

get(
  {
    method: "get",
    path: "/analysis/{season}/{round}/{tool}",
    request: {
      params: z.object({
        season: seasonParam,
        round: roundParam,
        tool: z.enum(TOOLS).openapi({ param: { name: "tool", in: "path" } }),
      }),
    },
    responses: ok("Datos de una herramienta (estrategia, ritmo, sectores o posiciones)"),
  },
  async (c, params) => {
    const season = await resolveSeason(reader(c), params.season!);
    return analysisFile(c, season, Number(params.round), params.tool!);
  },
);

get(
  {
    method: "get",
    path: "/analysis/{season}/{round}/telemetry/{driver}",
    request: {
      params: z.object({
        season: seasonParam,
        round: roundParam,
        driver: z.string().regex(/^\d{1,2}$/).openapi({ param: { name: "driver", in: "path" }, example: "44" }),
      }),
    },
    responses: ok("Telemetría reducida de la vuelta más rápida de un piloto"),
  },
  async (c, params) => {
    const season = await resolveSeason(reader(c), params.season!);
    return analysisFile(c, season, Number(params.round), `telemetry/${Number(params.driver)}`);
  },
);



get(
  {
    method: "get",
    path: "/circuits/{id}/layout",
    request: { params: z.object({ id: idParam("id") }) },
    responses: ok("Trazado del circuito, de la última carrera analizada allí (D-09)"),
  },
  async (c, params) => {
    // La clave lleva el análisis del que sale y la versión de la detección de frenadas: si cambia cualquiera
    // de los dos, el trazado nuevo se sirve al momento.
    const latest = await reader(c).latestAnalysisAtCircuit(params.id!);
    const variant = latest ? `${latest.season}-${latest.round}-${latest.version}-${latest.createdAt}-c${CORNERS_VERSION}` : "none";
    return cached(c, { ttl: DAY, source: SOURCE_OPENF1, variant }, async () => {
      const driver = latest?.telemetryDrivers[0];
      if (!latest || driver === undefined) return null;
      const object = await c.env.ANALYSIS.get(
        analysisKey(latest.season, latest.round, `telemetry/${driver}`, latest.version),
      );
      if (!object) return null;
      const layout = circuitLayout(await object.json<TelemetryData>());
      return { data: { ...layout, season: latest.season, round: latest.round }, updatedAt: null };
    });
  },
);

// ---- Fase 4: quiz semanal -------------------------------------------------------------------

app.use("/quiz/*", noQueryParams, rateLimit);

get(
  {
    method: "get",
    path: "/quiz/{week}",
    request: {
      params: z.object({
        week: z.string().regex(/^\d{4}-W\d{2}$/).openapi({ param: { name: "week", in: "path" }, example: "2026-W45" }),
      }),
    },
    responses: ok("Quiz de la semana: cinco preguntas con datos reales (COM-08)"),
  },
  async (c, params) =>
    cached(c, { ttl: DAY }, async () => {
      const quiz = await reader(c).getQuiz(params.week!);
      return quiz.questions.length ? { data: quiz, updatedAt: null } : null;
    }),
);

// ---- Fase 4: comunidad --------------------------------------------------------------------------

/** Ranking global de predicciones (COM-06): público, solo alias y puntos. */
app.use("/rankings/*", noQueryParams, rateLimit);
get(
  {
    method: "get",
    path: "/rankings/{season}",
    request: { params: z.object({ season: seasonParam }) },
    responses: ok("Ranking global de predicciones"),
  },
  async (c, params) => {
    const season = await resolveSeason(reader(c), params.season!);
    return cached(c, { ttl: 300 }, async () => {
      const rows = await createCommunity(c.env.DB).ranking(season);
      return {
        data: rows.slice(0, 100).map((r) => ({ rank: r.rank, name: r.name, points: r.points, exact: r.exact, poles: r.poles })),
        updatedAt: null,
      };
    });
  },
);

mountCommunity(app);
mountMailing(app);

app.doc31("/docs", {
  openapi: "3.1.0",
  info: {
    title: "Paddock Notes API",
    version: "1.0.0",
    description:
      "API pública de solo lectura de Paddock Notes. Datos de Jolpica F1 con licencia CC BY-NC-SA 4.0. " +
      "Proyecto no oficial, sin afiliación con Formula 1.",
    license: { name: "CC BY-NC-SA 4.0 (datos)", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  },
});

export default app;
