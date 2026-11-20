// Bindings of the paddock-web Worker (wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    API: Fetcher;
    ASSETS: Fetcher;
    SITE_URL: string;
    CSP_REPORT_ONLY: string;
  }
}

export {};
