import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo (TRA-46) contra la web desplegada: en local, el stack de `wrangler dev`;
 * en CI, la preview detrás de Cloudflare Access, con su service token (D-18).
 */
const accessHeaders: Record<string, string> = process.env.CF_ACCESS_CLIENT_ID
  ? {
      "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID,
      "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "",
    }
  : {};

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8789",
    extraHTTPHeaders: accessHeaders,
    timezoneId: "Europe/Madrid",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Modo oscuro: el contraste AA se comprueba también con la paleta oscura de la marca.
    { name: "dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
  ],
});
