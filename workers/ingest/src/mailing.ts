import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { createF1Reader } from "@paddock/db/f1-read";
import { createF1Writer } from "@paddock/db/f1-write";
import { createMailing, type MailingKind, type Recipient } from "@paddock/db/mailing";
import {
  analysisNoticeEmail,
  isLang,
  newsletterEmail,
  noteFor,
  raceNoticeEmail,
  unsubscribeHeaders,
  type DriverRef,
  type EmailContent,
  type Lang,
  type RaceDigest,
  type RaceNotice,
} from "@paddock/shared";
import type { Env } from "./env";

/**
 * Envíos (D-16): newsletter tras cada carrera (CON-06), aviso antes de cada GP y aviso al publicar el
 * análisis (COM-11). Un Workflow por envío: primero compone el contenido (sin idioma) y después manda
 * lotes de 40, un paso por lote (el binding admite 50 subpeticiones por invocación).
 */

const DAY = 86_400_000;
export const BATCH = 40;
const STEP = { retries: { limit: 3, delay: "1 minute", backoff: "exponential" }, timeout: "5 minutes" } as const;

export interface MailingParams {
  kind: MailingKind;
  season: number;
  round: number;
}

type Content =
  | { kind: "newsletter"; digest: RaceDigest }
  | { kind: "race"; notice: RaceNotice }
  | { kind: "analysis"; notice: { season: number; round: number; gp: string } };

const fullName = (d: DriverRef) => `${d.givenName} ${d.familyName}`;

/** Datos de la newsletter de una carrera (contenido.md §5.5), sacados solo de D1. */
export async function composeDigest(env: Env, season: number, round: number, now = Date.now()): Promise<RaceDigest | null> {
  const reader = createF1Reader(env.DB);
  const race = await reader.getRace(season, round, now);
  if (!race || race.results.length === 0) return null;
  const [quali, standings, analysis, history, next] = await Promise.all([
    reader.getQualifying(season, round),
    reader.getDriverStandings(season, round),
    reader.getAnalysis(season, round),
    reader.getThisWeek(now, 1),
    reader.getNextRace(now),
  ]);
  const classified = race.results.filter((r) => r.position !== null).sort((a, b) => a.position! - b.position!);
  const podium = classified.slice(0, 3).map((r) => ({ name: fullName(r.driver), team: r.constructor.name, gained: r.positionsGained }));
  const gainer = classified
    .slice(1)
    .filter((r) => (r.positionsGained ?? 0) > 0)
    .sort((a, b) => b.positionsGained! - a.positionsGained!)[0];
  const fastest = race.results.find((r) => r.fastestLap?.rank === 1);
  const poleRow = quali.find((q) => q.position === 1)?.driver ?? race.results.find((r) => r.grid === 1)?.driver;
  const [first, second] = standings?.rows ?? [];
  const past = history[0];
  return {
    season,
    round,
    gp: race.name,
    podium,
    pole: poleRow ? fullName(poleRow) : null,
    fastestLap: fastest ? { name: fullName(fastest.driver), time: fastest.fastestLap!.time } : null,
    biggestGain: gainer ? { name: fullName(gainer.driver), gained: gainer.positionsGained!, finish: gainer.position! } : null,
    leader: first ? { name: fullName(first.driver), points: first.points, gap: first.points - (second?.points ?? 0) } : null,
    hasAnalysis: analysis !== null,
    note: (() => {
      const n = noteFor(season, round);
      return n ? { slug: n.slug, title: n.title } : null;
    })(),
    history: past?.winner ? { season: past.season, gp: past.name, winner: fullName(past.winner) } : null,
    next: next
      ? {
          season: next.season,
          round: next.round,
          gp: next.name,
          circuitId: next.circuit.id,
          isSprintWeekend: next.isSprintWeekend,
          raceStart: next.startsAt,
        }
      : null,
  };
}

async function compose(env: Env, { kind, season, round }: MailingParams, now: number): Promise<Content | null> {
  if (kind === "newsletter") {
    const digest = await composeDigest(env, season, round, now);
    return digest ? { kind, digest } : null;
  }
  const race = await createF1Reader(env.DB).getRace(season, round, now);
  if (!race) return null;
  if (kind === "race") {
    return { kind, notice: { season, round, gp: race.name, sessions: race.sessions.map((s) => ({ kind: s.kind, startsAt: s.startsAt })) } };
  }
  return { kind, notice: { season, round, gp: race.name } };
}

/** Email de un destinatario: el contenido en su idioma y sus enlaces de baja (página y un clic). */
export function render(env: Env, content: Content, to: Recipient): EmailContent & { headers: Record<string, string> } {
  const lang: Lang = isLang(to.lang) ? to.lang : "es";
  const page = `${env.SITE_URL}/${lang}/newsletter/unsubscribe?token=${to.token}`;
  const oneClick = `${env.SITE_URL}/api/v1/email/unsubscribe/${to.token}`;
  const address = env.MAIL_POSTAL_ADDRESS ?? "";
  const email =
    content.kind === "newsletter"
      ? newsletterEmail(lang, content.digest, env.SITE_URL, page, address)
      : content.kind === "race"
        ? raceNoticeEmail(lang, content.notice, env.SITE_URL, page, address)
        : analysisNoticeEmail(lang, content.notice, env.SITE_URL, page, address);
  return { ...email, headers: unsubscribeHeaders(oneClick) };
}

export class MailingWorkflow extends WorkflowEntrypoint<Env, MailingParams> {
  override async run(event: WorkflowEvent<MailingParams>, step: WorkflowStep) {
    const params = event.payload;
    const content = await step.do("compose", STEP, async () => {
      const c = await compose(this.env, params, event.timestamp.getTime());
      if (!c) throw new NonRetryableError(`sin datos para ${params.kind} ${params.season}/${params.round}`);
      return c;
    });

    let cursor = "";
    let total = 0;
    for (let batch = 0; ; batch++) {
      // Si un lote falla a medias, el reintento puede repetir algún email de ese lote; nunca de los anteriores.
      const result = await step.do(`batch-${batch}`, STEP, async () => {
        const list = await createMailing(this.env.DB).recipients(params.kind, cursor, BATCH);
        for (const to of list) {
          await this.env.EMAIL.send({ from: this.env.EMAIL_FROM, to: to.email, ...render(this.env, content as Content, to) });
        }
        return { cursor: list.at(-1)?.id ?? cursor, count: list.length };
      });
      total += result.count;
      cursor = result.cursor;
      if (result.count < BATCH) break;
    }
    console.log(JSON.stringify({ event: "mailing", ...params, total }));
    return { ...params, total };
  }
}

/**
 * Lanza un envío una sola vez: la marca en `ingest_state` y el id del Workflow (único) evitan repetirlo
 * aunque el cron vuelva a pasar por la misma carrera.
 */
export async function startMailing(env: Env, params: MailingParams): Promise<string> {
  const id = `${params.kind}-${params.season}-${params.round}`;
  const writer = createF1Writer(env.DB);
  if (await writer.getState(`mail:${id}`)) return `ya enviado: ${id}`;
  try {
    await env.MAILING.create({ id, params });
  } catch (error) {
    if (!/already exists/i.test(String(error))) throw error;
  }
  await writer.setState(`mail:${id}`, new Date().toISOString());
  return `creado: ${id}`;
}

/** Aviso de GP (COM-11): cuando la primera sesión del próximo GP empieza en las próximas 48 h. */
export async function scheduleRaceNotice(env: Env, now = Date.now()): Promise<string> {
  const next = await createF1Reader(env.DB).getNextRace(now);
  const first = next?.sessions
    .map((s) => (s.startsAt ? Date.parse(s.startsAt) : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)[0];
  if (!next || first === undefined || first <= now || first - now > 2 * DAY) return "sin GP en 48 h";
  return startMailing(env, { kind: "race", season: next.season, round: next.round });
}

/** Newsletter (CON-06): el martes, si hubo carrera en los últimos 7 días y ya tiene resultado. */
export async function scheduleNewsletter(env: Env, now = Date.now()): Promise<string> {
  const last = await createF1Reader(env.DB).getLastRace(now);
  if (!last?.startsAt || last.results.length === 0) return "sin carrera con resultado";
  if (now - Date.parse(last.startsAt) > 7 * DAY) return "sin carrera esta semana";
  return startMailing(env, { kind: "newsletter", season: last.season, round: last.round });
}

/** Aviso de análisis (COM-11): solo de carreras recientes, no de las que se analizan al cargar el histórico. */
export async function notifyAnalysis(env: Env, season: number, round: number, now = Date.now()): Promise<string> {
  const race = await createF1Reader(env.DB).getRace(season, round, now);
  if (!race?.startsAt || now - Date.parse(race.startsAt) > 7 * DAY) return "carrera antigua: sin aviso";
  return startMailing(env, { kind: "analysis", season, round });
}
