import { createCommunity } from "@paddock/db/community";
import { createMailing } from "@paddock/db/mailing";
import type { Env } from "./env";

const DAY = 86_400_000;
/** Accounts inactive for 24 months: a warning and, 30 days later, deletion (security.md §17). */
export const INACTIVE_AFTER_MS = 730 * DAY;
export const GRACE_MS = 30 * DAY;

function warning(lang: string, url: string) {
  if (lang === "de") {
    return {
      subject: "Dein Konto bei Paddock Notes wird gelöscht",
      text: `Du hast dein Konto bei Paddock Notes seit zwei Jahren nicht genutzt. Wenn du dich nicht innerhalb von 30 Tagen anmeldest, löschen wir es zusammen mit deinen Tipps und Ligen.\n\nMelde dich an, um es zu behalten: ${url}/de/account`,
    };
  }
  return lang === "en"
    ? {
        subject: "Your Paddock Notes account will be deleted",
        text: `You haven't used your Paddock Notes account for two years. If you don't sign in within 30 days, we'll delete it along with your predictions and leagues.\n\nSign in to keep it: ${url}/en/account`,
      }
    : {
        subject: "Vamos a borrar tu cuenta de Paddock Notes",
        text: `Hace dos años que no usas tu cuenta de Paddock Notes. Si no entras en los próximos 30 días, la borraremos junto con tus predicciones y tus ligas.\n\nEntra para conservarla: ${url}/es/account`,
      };
}

/**
 * Retention (security.md §17): warns inactive accounts and deletes those that, warned more than 30 days ago,
 * are still inactive. A warning only counts if it is later than the last activity.
 */
export async function purgeInactiveAccounts(env: Env, now = Date.now()) {
  const community = createCommunity(env.DB);
  const candidates = await community.inactiveUsers(new Date(now - INACTIVE_AFTER_MS));
  let warned = 0;
  let deleted = 0;
  for (const u of candidates) {
    const warnedThisPeriod = u.warned_at !== null && u.warned_at > u.last_active;
    if (warnedThisPeriod && now - u.warned_at! > GRACE_MS) {
      await community.deleteUser(u.id);
      deleted++;
    } else if (!warnedThisPeriod) {
      // No Email Service binding (D-38): the account is still marked, nothing is sent.
      await env.EMAIL?.send({ from: env.EMAIL_FROM, to: u.email, ...warning(u.lang, env.SITE_URL) });
      await community.markInactiveWarned(u.id, new Date(now));
      warned++;
    }
  }
  // Newsletter sign-ups unconfirmed after 48 h: deleted.
  const pending = await createMailing(env.DB).purgePending(now);
  console.log(JSON.stringify({ event: "retention", warned, deleted, pending }));
  return { warned, deleted };
}
