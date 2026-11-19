import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha } from "better-auth/plugins/captcha";
import { magicLink } from "better-auth/plugins/magic-link";
import { drizzle } from "drizzle-orm/d1";
import { accounts, authSessions, users, verifications } from "@paddock/db/schema";
import { magicLinkEmail, sendEmail } from "./email";
import type { Env } from "./env";

const DAY = 86_400;

/**
 * Autenticación (D-17, seguridad.md §9): Better Auth sobre D1, creado por petición con los bindings.
 * - Sin contraseñas: enlace mágico de un solo uso (15 min, guardado como hash) y OAuth si hay credenciales.
 * - Cookies `__Host-`, HttpOnly, Secure, SameSite=Lax. Sin IP.
 * - Sesión: 7 días de inactividad, 30 días como máximo (la sesión no se renueva más allá).
 * - Turnstile en la petición del enlace mágico (COM-12).
 */
export function createAuth(env: Env) {
  const db = drizzle(env.DB);
  return betterAuth({
    appName: "Paddock Notes",
    baseURL: env.AUTH_BASE_URL,
    basePath: "/api/v1/auth",
    secret: env.AUTH_SECRET,
    trustedOrigins: env.TRUSTED_ORIGINS.split(","),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { users, auth_sessions: authSessions, accounts, verifications },
    }),
    user: {
      modelName: "users",
      additionalFields: {
        lang: { type: "string", defaultValue: "es", input: false },
        favorites: { type: "string", defaultValue: "[]", input: false },
      },
    },
    session: { modelName: "auth_sessions", expiresIn: 30 * DAY, updateAge: DAY, freshAge: 7 * DAY },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
    emailAndPassword: { enabled: false },
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
    },
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          // El idioma del email sale de la página a la que vuelve el enlace (/es/... o /en/...).
          const decoded = decodeURIComponent(url);
          const lang = decoded.includes("/en/") ? "en" : decoded.includes("/de/") ? "de" : "es";
          await sendEmail(env, { to: email, ...magicLinkEmail(lang, url) });
        },
      }),
      captcha({ provider: "cloudflare-turnstile", secretKey: env.TURNSTILE_SECRET, endpoints: ["/sign-in/magic-link"] }),
    ],
    advanced: {
      // Sin el prefijo __Secure- automático: el nombre ya lleva __Host- y los atributos fijan Secure.
      useSecureCookies: false,
      cookiePrefix: "__Host-pn",
      defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { disableIpTracking: true },
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
