import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sin caché incremental: todo el HTML se renderiza por petición (CSP con nonce, D-04).
// La caché vive en la API (Cache API + KV).
export default defineCloudflareConfig({});
