// Bindings of the paddock-web Worker (wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    API: Fetcher;
    ASSETS: Fetcher;
    SITE_URL: string;
    CSP_REPORT_ONLY: string;
    /** Turnstile site key. Locally, the test key that always passes. */
    TURNSTILE_SITE_KEY: string;
  }
}

export {};
