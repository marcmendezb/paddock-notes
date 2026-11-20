import type { ScheduleSession } from "./api";

/** Community rules (phase 4). Pure and tested: the API and the web app use the same ones. */

export const SCORING = { exact: 5, podium: 2, pole: 3 } as const;

export interface PredictionPicks {
  p1: string;
  p2: string;
  p3: string;
  pole: string;
}

export interface PredictionScore {
  points: number;
  exact: number;
  podium: number;
  pole: boolean;
}

/**
 * A prediction's score (COM-05) against the official result: 5 points per driver in their exact podium
 * position, 2 if they are on the podium but in another position and 3 for the pole. Computed on read, so it
 * updates itself if a penalty changes the result.
 */
export function scorePrediction(picks: PredictionPicks, podium: string[], pole: string | null): PredictionScore {
  const guesses = [picks.p1, picks.p2, picks.p3];
  let exact = 0;
  let inPodium = 0;
  guesses.forEach((g, i) => {
    if (podium[i] === g) exact++;
    else if (podium.includes(g)) inPodium++;
  });
  const poleHit = pole !== null && picks.pole === pole;
  return {
    points: exact * SCORING.exact + inPodium * SCORING.podium + (poleHit ? SCORING.pole : 0),
    exact,
    podium: inPodium,
    pole: poleHit,
  };
}

/** Predictions close when the first competitive session starts: qualifying or sprint qualifying. */
export function predictionDeadline(sessions: ScheduleSession[]): string | null {
  const starts = sessions
    .filter((s) => (s.kind === "qualifying" || s.kind === "sprint_qualifying") && s.startsAt)
    .map((s) => s.startsAt!)
    .sort();
  return starts[0] ?? null;
}

export function validPicks(p: PredictionPicks, allowed: Set<string>): boolean {
  const podium = [p.p1, p.p2, p.p3];
  return new Set(podium).size === 3 && [...podium, p.pole].every((id) => allowed.has(id));
}

/**
 * Ranking order (COM-06), a published rule: more points; if tied, more exact podiums; if still tied, more
 * correct poles; otherwise they share the position.
 */
export function rankUsers<T extends { points: number; exact: number; poles: number }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || b.exact - a.exact || b.poles - a.poles);
  let rank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.points !== r.points || prev.exact !== r.exact || prev.poles !== r.poles) rank = i + 1;
    return { ...r, rank };
  });
}

/** Blocked words in display names and league names (COM-13). A short list; reports cover the rest. */
const BLOCKED = [
  "admin", "moderador", "moderator", "paddocknotes", "oficial", "official", "fia",
  "puta", "puto", "mierda", "joder", "cabron", "gilipollas", "maricon", "nazi", "hitler",
  "fuck", "shit", "bitch", "cunt", "nigger", "faggot", "retard",
];

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[^a-z]/g, "");

export type NameProblem = "length" | "characters" | "blocked";

/** Display names and league names: 3 to 24 characters, letters, numbers, spaces, hyphens and underscores. */
export function validateName(name: string): NameProblem | null {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 24) return "length";
  if (!/^[\p{L}\p{N} _-]+$/u.test(trimmed)) return "characters";
  const flat = normalizeName(trimmed);
  if (BLOCKED.some((w) => flat.includes(w))) return "blocked";
  return null;
}
