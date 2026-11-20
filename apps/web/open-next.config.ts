import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: all HTML is rendered per request (a CSP with a nonce, D-04).
// Caching lives in the API (Cache API + KV).
export default defineCloudflareConfig({});
