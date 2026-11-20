import "server-only";
import { api } from "./api";

/**
 * Resolves what the visitor types in the head-to-head form: an exact ID or a name.
 * If several drivers share that name, the most recent wins (the search orders by last season).
 */
export async function resolveDriver(input: string | undefined): Promise<string | null> {
  const value = input?.trim();
  if (!value || value.length > 50) return null;
  if (/^[a-z0-9_-]{2,64}$/.test(value) && (await api.driver(value))) return value;
  if (value.length < 2) return null;
  const results = await api.search(value);
  return results?.data.find((r) => r.kind === "driver")?.id ?? null;
}
