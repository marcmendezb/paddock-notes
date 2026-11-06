import type { DriverRef } from "./api";

/** Quiz semanal (COM-08): preguntas generadas con datos reales; la web redacta el texto en cada idioma. */

export type QuizKind = "race-winner" | "champion" | "constructor-champion" | "season-wins" | "pole";

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  season: number;
  /** Nombre del GP en inglés (la web lo traduce) o nombre del piloto, según el tipo. */
  subject: string | null;
  options: QuizOption[];
  answer: string;
  /** Dato para la explicación: posición, puntos o número de victorias. */
  detail: string | null;
  race?: { season: number; round: number };
}

export interface Quiz {
  week: string;
  questions: QuizQuestion[];
}

/** Semana ISO 8601: "2026-W45". */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Generador pseudoaleatorio determinista (mulberry32) sembrado con un texto. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const driverOption = (d: DriverRef): QuizOption => ({ id: d.id, label: `${d.givenName} ${d.familyName}` });
