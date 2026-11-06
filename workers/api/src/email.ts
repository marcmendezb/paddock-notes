import type { Env } from "./env";

/**
 * Envío de email con Cloudflare Email Service (D-16). En `wrangler dev` el binding se simula y el mensaje
 * se escribe en el log. Nunca se registra el email completo (seguridad.md §16).
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}

export async function sendEmail(env: Env, email: OutgoingEmail): Promise<void> {
  await env.EMAIL.send({ from: env.EMAIL_FROM, ...email });
  console.log(JSON.stringify({ event: "email_sent", subject: email.subject, toDomain: email.to.split("@")[1] }));
}

export function magicLinkEmail(lang: string, url: string): Omit<OutgoingEmail, "to"> {
  return lang === "en"
    ? {
        subject: "Your Paddock Notes sign-in link",
        text: `Use this link to sign in to Paddock Notes. It works once and expires in 15 minutes.\n\n${url}\n\nIf you didn't ask for it, ignore this email.`,
      }
    : {
        subject: "Tu enlace para entrar en Paddock Notes",
        text: `Usa este enlace para entrar en Paddock Notes. Funciona una sola vez y caduca en 15 minutos.\n\n${url}\n\nSi no lo has pedido tú, ignora este email.`,
      };
}
