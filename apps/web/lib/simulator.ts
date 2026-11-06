import { racePoints, sprintPoints } from "@paddock/shared";

/**
 * Simulador de campeonato "¿y si...?" (COM-09): suma a la clasificación actual los puntos de las
 * posiciones que elige el visitante en las rondas que faltan. Todo cabe en la URL (formulario GET).
 */

export interface SimDriver {
  id: string;
  name: string;
  points: number;
}

export interface SimRound {
  round: number;
  name: string;
  isSprintWeekend: boolean;
}

export type Choices = Record<string, string | string[] | undefined>;

/** Nombre del campo del formulario: r{ronda}_{piloto} (carrera) o s{ronda}_{piloto} (sprint). */
export const field = (kind: "r" | "s", round: number, driver: string) => `${kind}${round}_${driver}`;

export function parsePosition(value: string | string[] | undefined): number | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= 20 ? n : null;
}

export function simulate(season: number, drivers: SimDriver[], rounds: SimRound[], choices: Choices) {
  const conflicts: { round: number; kind: "r" | "s"; position: number }[] = [];
  const totals = new Map(drivers.map((d) => [d.id, { ...d, gained: 0 }]));
  for (const r of rounds) {
    for (const kind of r.isSprintWeekend ? (["r", "s"] as const) : (["r"] as const)) {
      const used = new Set<number>();
      for (const d of drivers) {
        const pos = parsePosition(choices[field(kind, r.round, d.id)]);
        if (pos === null) continue;
        if (used.has(pos)) conflicts.push({ round: r.round, kind, position: pos });
        used.add(pos);
        const points = kind === "r" ? (racePoints(season, pos) ?? 0) : sprintPoints(season, pos);
        totals.get(d.id)!.gained += points;
      }
    }
  }
  const projected = [...totals.values()]
    .map((d) => ({ ...d, total: d.points + d.gained }))
    .sort((a, b) => b.total - a.total || a.points - b.points);
  return { projected, conflicts };
}
