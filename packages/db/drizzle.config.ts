import { defineConfig } from "drizzle-kit";

// Solo genera SQL; las migraciones se aplican con `wrangler d1 migrations apply` (stack.md §8.1).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./migrations",
});
