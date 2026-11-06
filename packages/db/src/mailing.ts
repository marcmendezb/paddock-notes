/**
 * Listas de envío (D-16): newsletter (CON-06) y avisos de la cuenta (COM-11). Solo tablas de comunidad.
 * Los tokens de confirmación se guardan como hash; los de baja son aleatorios y van en cada email.
 */
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

const { users, newsletterSubscribers } = schema;

export type MailingKind = "newsletter" | "race" | "analysis";
export interface Recipient {
  id: string;
  email: string;
  lang: string;
  token: string;
}

const CONFIRM_TTL_MS = 48 * 3_600_000;
/** No se reenvía el email de confirmación a la misma dirección antes de 10 minutos (evita usarlo para molestar). */
const RESEND_AFTER_MS = 10 * 60_000;

function randomToken(bytes = 24): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createMailing(d1: D1Database) {
  const db = drizzle(d1, { schema });

  /**
   * Alta en la newsletter. Devuelve el token que hay que enviar para confirmar, o null si no hay que
   * enviar nada (ya activo, o confirmación enviada hace muy poco). La respuesta pública es la misma en
   * todos los casos, para no revelar quién está suscrito.
   */
  async function subscribe(email: string, lang: string, now = Date.now()): Promise<{ token: string } | null> {
    const address = email.trim().toLowerCase();
    const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, address));
    if (existing?.status === "active") return null;
    if (existing?.confirmExpiresAt && existing.confirmExpiresAt.getTime() - CONFIRM_TTL_MS + RESEND_AFTER_MS > now) return null;
    const token = randomToken();
    const pending = { lang, confirmHash: await sha256(token), confirmExpiresAt: new Date(now + CONFIRM_TTL_MS) };
    if (existing) {
      await db.update(newsletterSubscribers).set(pending).where(eq(newsletterSubscribers.id, existing.id));
    } else {
      await db.insert(newsletterSubscribers).values({
        id: crypto.randomUUID(),
        email: address,
        status: "pending",
        unsubscribeToken: randomToken(),
        createdAt: new Date(now),
        ...pending,
      });
    }
    return { token };
  }

  /** Doble confirmación: activa la suscripción si el token existe y no ha caducado. */
  async function confirm(token: string, now = Date.now()): Promise<boolean> {
    const hash = await sha256(token);
    const rows = await db
      .update(newsletterSubscribers)
      .set({ status: "active", confirmHash: null, confirmExpiresAt: null, confirmedAt: new Date(now) })
      .where(and(eq(newsletterSubscribers.confirmHash, hash), gt(newsletterSubscribers.confirmExpiresAt, new Date(now))))
      .returning({ id: newsletterSubscribers.id });
    return rows.length > 0;
  }

  /** Baja en un clic: borra al suscriptor o apaga los avisos de la cuenta que tenga ese token. */
  async function unsubscribe(token: string): Promise<boolean> {
    const [subs, accounts] = await db.batch([
      db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.unsubscribeToken, token)).returning({ id: newsletterSubscribers.id }),
      db
        .update(users)
        .set({ notifyRace: false, notifyAnalysis: false })
        .where(eq(users.emailToken, token))
        .returning({ id: users.id }),
    ]);
    return subs.length + accounts.length > 0;
  }

  async function notifications(userId: string) {
    const [u] = await db
      .select({ race: users.notifyRace, analysis: users.notifyAnalysis })
      .from(users)
      .where(eq(users.id, userId));
    return u ?? { race: false, analysis: false };
  }

  async function setNotifications(userId: string, prefs: { race: boolean; analysis: boolean }) {
    await db
      .update(users)
      .set({
        notifyRace: prefs.race,
        notifyAnalysis: prefs.analysis,
        emailToken: sql`coalesce(${users.emailToken}, ${randomToken()})`,
      })
      .where(eq(users.id, userId));
  }

  /** Destinatarios de un envío, por lotes ordenados por id (el Workflow guarda el cursor). */
  async function recipients(kind: MailingKind, after: string, limit = 40): Promise<Recipient[]> {
    if (kind === "newsletter") {
      return db
        .select({
          id: newsletterSubscribers.id,
          email: newsletterSubscribers.email,
          lang: newsletterSubscribers.lang,
          token: newsletterSubscribers.unsubscribeToken,
        })
        .from(newsletterSubscribers)
        .where(and(eq(newsletterSubscribers.status, "active"), gt(newsletterSubscribers.id, after)))
        .orderBy(asc(newsletterSubscribers.id))
        .limit(limit);
    }
    const flag = kind === "race" ? users.notifyRace : users.notifyAnalysis;
    const rows = await db
      .select({ id: users.id, email: users.email, lang: users.lang, token: users.emailToken })
      .from(users)
      .where(and(eq(flag, true), gt(users.id, after)))
      .orderBy(asc(users.id))
      .limit(limit);
    return rows.filter((r): r is Recipient => r.token !== null);
  }

  /** Altas sin confirmar caducadas: se borran (no se guarda un email que nadie confirmó). */
  async function purgePending(now = Date.now()) {
    const rows = await db
      .delete(newsletterSubscribers)
      .where(and(eq(newsletterSubscribers.status, "pending"), lt(newsletterSubscribers.confirmExpiresAt, new Date(now))))
      .returning({ id: newsletterSubscribers.id });
    return rows.length;
  }

  return { subscribe, confirm, unsubscribe, notifications, setNotifications, recipients, purgePending };
}

export type Mailing = ReturnType<typeof createMailing>;
