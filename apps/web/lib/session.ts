import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Driver } from "./session-types";
import { userFetch } from "./api";

export type { Driver };

/** The visitor's session cookie, as it arrives (only __Host-pn.* cookies are forwarded). */
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

/** The signed-in visitor's profile, or null. A single API call per request (React cache). */
export const currentUser = cache(async (): Promise<Me | null> => {
  const cookie = await cookieHeader();
  if (!cookie.includes("__Host-pn.")) return null;
  const res = await userFetch("/me", { cookie });
  if (!res.ok) return null;
  return ((await res.json()) as { data: Me }).data;
});

/** The visitor's favourites (COM-10): "d:driver" and "c:team". Empty without a session. */
export async function favoriteSet(): Promise<Set<string>> {
  try {
    return new Set((await currentUser())?.favorites ?? []);
  } catch {
    // If the API does not answer, the page renders anyway, without highlighting anything.
    return new Set();
  }
}

/** An authenticated GET to the API; null if there is no session or the resource does not exist. */
export async function userGet<T>(path: string): Promise<T | null> {
  const res = await userFetch(path, { cookie: await cookieHeader() });
  if (!res.ok) return null;
  return ((await res.json()) as { data: T }).data;
}
