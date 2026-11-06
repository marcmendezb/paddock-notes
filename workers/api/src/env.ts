export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ANALYSIS: R2Bucket;
  RATE_LIMIT_READ: RateLimit;
  RATE_LIMIT_WRITE: RateLimit;
  SITE_URL: string;
  /** Cloudflare Email Service (D-16). */
  EMAIL: {
    send: (message: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }) => Promise<unknown>;
  };
  EMAIL_FROM: string;
  /** Origen público de la API para los enlaces de autenticación (en producción, el mismo que la web). */
  AUTH_BASE_URL: string;
  /** Orígenes que pueden enviar peticiones que cambian estado (CSRF, seguridad.md §5). Separados por comas. */
  TRUSTED_ORIGINS: string;
  AUTH_SECRET: string;
  TURNSTILE_SECRET: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export type AppEnv = { Bindings: Env };
