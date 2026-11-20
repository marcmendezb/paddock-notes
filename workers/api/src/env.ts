export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ANALYSIS: R2Bucket;
  RATE_LIMIT_READ: RateLimit;
  RATE_LIMIT_WRITE: RateLimit;
  SITE_URL: string;
  /**
   * Cloudflare Email Service (D-16). Not bound today: Paddock Notes is a portfolio project and sends no email
   * (D-38); without it, sending is logged and skipped.
   */
  EMAIL?: {
    send: (message: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }) => Promise<unknown>;
  };
  EMAIL_FROM: string;
  /** The API's public origin for authentication links (in production, the same as the web app's). */
  AUTH_BASE_URL: string;
  /** Origins allowed to send state-changing requests (CSRF, security.md §5). Comma-separated. */
  TRUSTED_ORIGINS: string;
  AUTH_SECRET: string;
  TURNSTILE_SECRET: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export type AppEnv = { Bindings: Env };
