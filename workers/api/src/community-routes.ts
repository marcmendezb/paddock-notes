import type { Context, Hono } from "hono";
import { z } from "zod";
import { createCommunity } from "@paddock/db/community";
import { createMailing } from "@paddock/db/mailing";
import { createF1Reader } from "@paddock/db/f1-read";
import {
  isLang,
  predictionDeadline,
  scorePrediction,
  validateName,
  validPicks,
} from "@paddock/shared";
import { createAuth } from "./auth";
import type { AppEnv } from "./env";
import { HttpError } from "./errors";

/**
 * Rutas de comunidad (fase 4). Todas exigen sesión salvo el ranking global. La autorización se resuelve
 * en la consulta (seguridad.md §10): nadie puede leer ni tocar recursos de otro usuario.
 */

const id = z.string().regex(/^[a-z0-9_-]{1,64}$/);
const picksSchema = z.object({ p1: id, p2: id, p3: id, pole: id }).strict();
/** Favoritos (COM-10): "d:" piloto, "c:" equipo. */
const favorite = z.string().regex(/^[dc]:[a-z0-9_-]{1,60}$/);
const profileSchema = z
  .object({
    name: z.string().max(40).optional(),
    lang: z.string().optional(),
    favorites: z.array(favorite).max(20).optional(),
  })
  .strict();

async function requireUser(c: Context<AppEnv>) {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new HttpError("unauthorized", "Unauthorized. Please sign in.");
  return session.user;
}

async function body<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T>> {
  const text = await c.req.text();
  // Cuerpo máximo de 16 kB en rutas POST (seguridad.md §6).
  if (text.length > 16_384) throw new HttpError("invalid_parameter", "Request payload too large.");
  let json: unknown;
  try {
    json = JSON.parse(text || "{}");
  } catch {
    throw new HttpError("invalid_parameter", "Invalid JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new HttpError("invalid_parameter", "Invalid data.");
  return parsed.data;
}

const noStore = { "cache-control": "no-store" };
const seasonOf = (raw: string) => {
  if (!/^\d{4}$/.test(raw)) throw new HttpError("invalid_parameter", "Invalid season.");
  return Number(raw);
};

const roundOf = (raw: string) => {
  if (!/^\d{1,2}$/.test(raw)) throw new HttpError("invalid_parameter", "Invalid round.");
  return Number(raw);
};

export function mountCommunity(app: Hono<AppEnv>) {
  app.on(["GET", "POST"], "/auth/*", (c) => {
    // Better Auth comprueba el Origin por su cuenta. En peticiones internas (Service Binding) se lo
    // reconstruimos a partir de x-paddock-origin, ya validado por el middleware.
    const internal = !c.req.header("cf-connecting-ip");
    const forwarded = c.req.header("x-paddock-origin");
    if (c.req.method === "POST" && internal && forwarded && !c.req.header("origin")) {
      const headers = new Headers(c.req.raw.headers);
      headers.set("origin", forwarded);
      return createAuth(c.env).handler(new Request(c.req.raw, { headers }));
    }
    return createAuth(c.env).handler(c.req.raw);
  });

  app.get("/me", async (c) => {
    const user = await requireUser(c);
    const community = createCommunity(c.env.DB);
    const [profile, leagues, streak, notifications] = await Promise.all([
      community.profile(user.id),
      community.myLeagues(user.id),
      community.quizStreak(user.id),
      createMailing(c.env.DB).notifications(user.id),
    ]);
    return c.json({ data: { ...profile, leagues, quizStreak: streak, notifications } }, 200, noStore);
  });

  app.post("/me", async (c) => {
    const user = await requireUser(c);
    const data = await body(c, profileSchema);
    if (data.name !== undefined) {
      const problem = validateName(data.name);
      if (problem) throw new HttpError("invalid_parameter", `alias:${problem}`);
    }
    if (data.lang !== undefined && !isLang(data.lang)) throw new HttpError("invalid_parameter", "Invalid language.");
    await createCommunity(c.env.DB).updateProfile(user.id, { ...data, name: data.name?.trim() });
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  app.get("/me/export", async (c) => {
    const user = await requireUser(c);
    const data = await createCommunity(c.env.DB).exportUser(user.id);
    return c.json(data, 200, {
      ...noStore,
      "content-disposition": 'attachment; filename="paddock-notes-datos.json"',
    });
  });

  /** Borrado efectivo e inmediato (COM-03): usuario, sesiones, predicciones, ligas propias y quiz. */
  app.delete("/me", async (c) => {
    const user = await requireUser(c);
    await createCommunity(c.env.DB).deleteUser(user.id);
    return c.json({ data: { ok: true } }, 200, {
      ...noStore,
      "set-cookie": "__Host-pn.session_token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
    });
  });

  /** Mis predicciones de la temporada con su puntuación, recalculada con el resultado oficial (COM-05). */
  app.get("/predictions/:season/me", async (c) => {
    const user = await requireUser(c);
    const season = seasonOf(c.req.param("season"));
    const community = createCommunity(c.env.DB);
    const [mine, official] = await Promise.all([community.myPredictions(user.id, season), community.officialResults(season)]);
    const rows = mine
      .sort((a, b) => a.round - b.round)
      .map((p) => {
        const result = official.get(p.round);
        return { ...p, score: result && result.podium.length === 3 ? scorePrediction(p, result.podium, result.pole) : null };
      });
    return c.json({ data: rows }, 200, noStore);
  });

  /** Formulario de predicción de una ronda: plazo, pilotos válidos y lo que ya envió el usuario. */
  app.get("/predictions/:season/:round", async (c) => {
    const user = await requireUser(c);
    const season = seasonOf(c.req.param("season"));
    const round = roundOf(c.req.param("round"));
    const reader = createF1Reader(c.env.DB);
    const [race, standings, mine] = await Promise.all([
      reader.getRace(season, round),
      reader.getDriverStandings(season),
      createCommunity(c.env.DB).myPredictions(user.id, season),
    ]);
    if (!race) throw new HttpError("not_found", "Race not found.");
    const deadline = predictionDeadline(race.sessions);
    return c.json(
      {
        data: {
          deadline,
          open: deadline !== null && Date.parse(deadline) > Date.now(),
          drivers: (standings?.rows ?? []).map((r) => r.driver),
          picks: mine.find((p) => p.round === round) ?? null,
        },
      },
      200,
      noStore,
    );
  });

  /** Guarda o cambia la predicción hasta el cierre (COM-04). */
  app.post("/predictions/:season/:round", async (c) => {
    const user = await requireUser(c);
    const season = seasonOf(c.req.param("season"));
    const round = roundOf(c.req.param("round"));
    const picks = await body(c, picksSchema);
    const reader = createF1Reader(c.env.DB);
    const [race, standings] = await Promise.all([reader.getRace(season, round), reader.getDriverStandings(season)]);
    if (!race) throw new HttpError("not_found", "Race not found.");
    const deadline = predictionDeadline(race.sessions);
    if (!deadline || Date.parse(deadline) <= Date.now()) {
      throw new HttpError("forbidden", "Predictions for this race are closed.");
    }
    const allowed = new Set((standings?.rows ?? []).map((r) => r.driver.id));
    if (!validPicks(picks, allowed)) throw new HttpError("invalid_parameter", "Invalid prediction.");
    await createCommunity(c.env.DB).savePrediction(user.id, season, round, picks);
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  app.post("/leagues", async (c) => {
    const user = await requireUser(c);
    const { name } = await body(c, z.object({ name: z.string().max(40) }).strict());
    const problem = validateName(name);
    if (problem) throw new HttpError("invalid_parameter", `league:${problem}`);
    const leagueId = await createCommunity(c.env.DB).createLeague(user.id, name.trim());
    return c.json({ data: { id: leagueId } }, 201, noStore);
  });

  app.post("/leagues/join", async (c) => {
    const user = await requireUser(c);
    const { token } = await body(c, z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }).strict());
    const result = await createCommunity(c.env.DB).joinLeague(user.id, token);
    if (!result.ok) {
      throw result.reason === "full"
        ? new HttpError("forbidden", "League is full.")
        : new HttpError("not_found", "Invalid or expired invite.");
    }
    return c.json({ data: { id: result.id } }, 200, noStore);
  });

  app.get("/leagues/:id/:season", async (c) => {
    const user = await requireUser(c);
    const leagueId = c.req.param("id");
    if (!/^[0-9a-f-]{36}$/.test(leagueId)) throw new HttpError("not_found", "League not found.");
    const league = await createCommunity(c.env.DB).league(user.id, leagueId, seasonOf(c.req.param("season")));
    if (!league) throw new HttpError("not_found", "League not found.");
    return c.json({ data: league }, 200, noStore);
  });

  app.post("/leagues/:id/invite", async (c) => {
    const user = await requireUser(c);
    await createCommunity(c.env.DB).rotateInvite(user.id, c.req.param("id"));
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  app.post("/leagues/:id/leave", async (c) => {
    const user = await requireUser(c);
    await createCommunity(c.env.DB).leaveLeague(user.id, c.req.param("id"));
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  /** Puntuación del quiz con cuenta (COM-08): el servidor corrige; nunca se fía de la nota del cliente. */
  app.post("/quiz-scores", async (c) => {
    const user = await requireUser(c);
    const { week, answers } = await body(
      c,
      z.object({ week: z.string().regex(/^\d{4}-W\d{2}$/), answers: z.record(z.string().max(4), z.string().max(64)) }).strict(),
    );
    const quiz = await createF1Reader(c.env.DB).getQuiz(week);
    const score = quiz.questions.filter((q) => answers[q.id] === q.answer).length;
    const community = createCommunity(c.env.DB);
    await community.saveQuiz(user.id, week, score, quiz.questions.length);
    return c.json({ data: { score, total: quiz.questions.length, streak: await community.quizStreak(user.id) } }, 200, noStore);
  });

  /** Denuncia de un alias o un nombre de liga (COM-13). */
  app.post("/reports", async (c) => {
    const user = await requireUser(c);
    const { kind, targetId } = await body(
      c,
      z.object({ kind: z.enum(["alias", "league"]), targetId: z.string().max(64) }).strict(),
    );
    await createCommunity(c.env.DB).report(user.id, kind, targetId);
    return c.json({ data: { ok: true } }, 201, noStore);
  });
}
