// Bindings del Worker paddock-web (wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    API: Fetcher;
    ASSETS: Fetcher;
    SITE_URL: string;
    CSP_REPORT_ONLY: string;
    /** Clave pública de Turnstile. En local, la de pruebas que siempre aprueba. */
    TURNSTILE_SITE_KEY: string;
  }
}

export {};
