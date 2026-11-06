import type { ScheduleSession } from "./api";

/** Reglas de la comunidad (fase 4). Puras y con tests: la API y la web usan las mismas. */

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
 * Puntuación de una predicción (COM-05) con el resultado oficial: 5 puntos por piloto en su posición
 * exacta del podio, 2 si está en el podio pero en otra posición y 3 por la pole. Se calcula al leer,
 * así que se actualiza sola si una sanción cambia el resultado.
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

/** Las predicciones se cierran al empezar la primera sesión competitiva: clasificación o clasificación sprint. */
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
 * Orden del ranking (COM-06), criterio publicado: más puntos; si empatan, más podios exactos; si siguen
 * empatados, más poles acertadas; y si no, comparten posición.
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

/** Palabras bloqueadas en alias y nombres de liga (COM-13). Lista corta; las denuncias cubren el resto. */
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

/** Alias y nombres de liga: 3–24 caracteres, letras, números, espacios, guiones y guiones bajos. */
export function validateName(name: string): NameProblem | null {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 24) return "length";
  if (!/^[\p{L}\p{N} _-]+$/u.test(trimmed)) return "characters";
  const flat = normalizeName(trimmed);
  if (BLOCKED.some((w) => flat.includes(w))) return "blocked";
  return null;
}
