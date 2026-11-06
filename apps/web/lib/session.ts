import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Driver } from "./session-types";
import { userFetch } from "./api";

export type { Driver };

/** Cookie de sesión del visitante, tal cual llega (solo se reenvían las __Host-pn.*). */
export async function cookieHeader(): Promise<string> {
  return (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export interface Me {
  id: string;
  name: string;
  email: string;
  lang: string;
  favorites: string[];
  leagues: { id: string; name: string }[];
  quizStreak: number;
  notifications: { race: boolean; analysis: boolean };
}

/** Perfil del visitante con sesión, o null. Una sola llamada a la API por petición (cache de React). */
export const currentUser = cache(async (): Promise<Me | null> => {
  const cookie = await cookieHeader();
  if (!cookie.includes("__Host-pn.")) return null;
  const res = await userFetch("/me", { cookie });
  if (!res.ok) return null;
  return ((await res.json()) as { data: Me }).data;
});

/** Favoritos del visitante (COM-10): "d:piloto" y "c:equipo". Vacío sin sesión. */
export async function favoriteSet(): Promise<Set<string>> {
  try {
    return new Set((await currentUser())?.favorites ?? []);
  } catch {
    // Si la API no responde, la página sale igual, sin destacar nada.
    return new Set();
  }
}

/** GET autenticado a la API; null si no hay sesión o el recurso no existe. */
export async function userGet<T>(path: string): Promise<T | null> {
  const res = await userFetch(path, { cookie: await cookieHeader() });
  if (!res.ok) return null;
  return ((await res.json()) as { data: T }).data;
}
