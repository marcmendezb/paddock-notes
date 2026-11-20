import type { Context, Hono } from "hono";
import { z } from "zod";
import { createMailing } from "@paddock/db/mailing";
import { isLang, newsletterConfirmEmail } from "@paddock/shared";
import { createAuth } from "./auth";
import { sendEmail } from "./email";
import type { AppEnv } from "./env";
import { HttpError } from "./errors";

/**
 * Newsletter (NUC-10, CON-06) and account notifications (COM-11), D-16. Sign-up answers the same whether or
 * not the address exists (it does not reveal who is subscribed) and requires Turnstile (COM-12) and double opt-in.
 */

const token = z.string().regex(/^[a-f0-9]{48}$/);
const noStore = { "cache-control": "no-store" };

async function json<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T>> {
  const text = await c.req.text();
  if (text.length > 4_096) throw new HttpError("invalid_parameter", "Request payload too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(text || "{}");
  } catch {
    throw new HttpError("invalid_parameter", "Invalid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError("invalid_parameter", "Invalid data.");
  return parsed.data;
}

/** Server-side Turnstile verification (security.md §5); the secret key never leaves the Worker. */
async function verifyTurnstile(c: Context<AppEnv>, response: string | undefined): Promise<boolean> {
  if (!response) return false;
  const body = new URLSearchParams({ secret: c.env.TURNSTILE_SECRET, response });
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-paddock-client-ip");
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

export function mountMailing(app: Hono<AppEnv>) {
  app.post("/newsletter", async (c) => {
    const { email, lang } = await json(
      c,
      // Explicit consent (GDPR art. 7): without the box ticked there is no sign-up.
      z.object({ email: z.string().trim().max(200).pipe(z.email()), lang: z.string(), consent: z.literal(true) }).strict(),
    );
    if (!isLang(lang)) throw new HttpError("invalid_parameter", "Invalid language.");
    if (!(await verifyTurnstile(c, c.req.header("x-captcha-response")))) {
      throw new HttpError("forbidden", "Bot verification failed.");
    }
    const pending = await createMailing(c.env.DB).subscribe(email, lang);
    if (pending) {
      const url = `${c.env.SITE_URL}/${lang}/newsletter/confirm?token=${pending.token}`;
      await sendEmail(c.env, { to: email, ...newsletterConfirmEmail(lang, url) });
    }
    return c.json({ data: { ok: true } }, 202, noStore);
  });

  app.post("/newsletter/confirm", async (c) => {
    const body = await json(c, z.object({ token }).strict());
    const ok = await createMailing(c.env.DB).confirm(body.token);
    if (!ok) throw new HttpError("not_found", "Link is invalid or has expired.");
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  /**
   * One-click unsubscribe (RFC 8058). Answers 200 even if the token no longer exists: unsubscribing twice is
   * not an error, and that way it cannot be used to probe tokens.
   */
  app.post("/email/unsubscribe/:token", async (c) => {
    const parsed = token.safeParse(c.req.param("token"));
    if (parsed.success) await createMailing(c.env.DB).unsubscribe(parsed.data);
    return c.json({ data: { ok: true } }, 200, noStore);
  });

  app.post("/me/notifications", async (c) => {
    const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new HttpError("unauthorized", "Unauthorized. Please sign in.");
    const prefs = await json(c, z.object({ race: z.boolean(), analysis: z.boolean() }).strict());
    await createMailing(c.env.DB).setNotifications(session.user.id, prefs);
    return c.json({ data: { ok: true } }, 200, noStore);
  });
}
