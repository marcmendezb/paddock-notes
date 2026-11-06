import "server-only";
import { api } from "./api";

/**
 * Resuelve lo que escribe el visitante en el formulario del cara a cara: un ID exacto o un nombre.
 * Si hay varios pilotos con ese nombre, gana el más reciente (la búsqueda ordena por última temporada).
 */
export async function resolveDriver(input: string | undefined): Promise<string | null> {
  const value = input?.trim();
  if (!value || value.length > 50) return null;
  if (/^[a-z0-9_-]{2,64}$/.test(value) && (await api.driver(value))) return value;
  if (value.length < 2) return null;
  const results = await api.search(value);
  return results?.data.find((r) => r.kind === "driver")?.id ?? null;
}
