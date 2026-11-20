import { defineConfig } from "drizzle-kit";

// Only generates SQL; migrations are applied with `wrangler d1 migrations apply` (stack.md §8.1).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./migrations",
});
