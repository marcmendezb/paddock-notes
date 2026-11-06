import path from "node:path";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "../../packages/db/migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            AUTH_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
            TURNSTILE_SECRET: "1x0000000000000000000000000000000AA",
            AUTH_BASE_URL: "http://localhost:8787",
            TRUSTED_ORIGINS: "http://localhost:8789",
          },
        },
      }),
    ],
    test: { setupFiles: ["./test/setup.ts"] },
  };
});
