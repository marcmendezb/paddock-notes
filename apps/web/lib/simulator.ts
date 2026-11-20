import { racePoints, sprintPoints } from "@paddock/shared";

/**
 * The "what if...?" championship simulator (COM-09): adds to the current standings the points of the
 * positions the visitor picks in the remaining rounds. It all fits in the URL (a GET form).
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

/** The form field's name: r{round}_{driver} (race) or s{round}_{driver} (sprint). */
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
