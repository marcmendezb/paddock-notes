/**
 * Quién puede ganar todavía el título (NUC-36). Cálculo matemático con los puntos en juego que quedan:
 * un piloto sigue en la pelea si, ganando todo lo que falta, alcanza al líder (el empate cuenta como
 * posible, porque lo resuelve el desempate por victorias). Solo para el sistema de puntos desde 2010.
 */

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS_2022 = [8, 7, 6, 5, 4, 3, 2, 1];
const SPRINT_POINTS_2021 = [3, 2, 1];

/** Puntos de carrera por posición con el sistema desde 2010; null antes de 2010. */
export function racePoints(season: number, position: number | null): number | null {
  if (season < 2010) return null;
  return position === null ? 0 : (RACE_POINTS[position - 1] ?? 0);
}

/** Puntos del sprint por posición (8 a 1 desde 2022; 3 a 1 en 2021). */
export function sprintPoints(season: number, position: number | null): number {
  const table = season >= 2022 ? SPRINT_POINTS_2022 : season === 2021 ? SPRINT_POINTS_2021 : [];
  return position === null ? 0 : (table[position - 1] ?? 0);
}

/** Puntos máximos que un piloto puede sumar en una ronda, según la temporada. */
export function maxPointsPerRound(season: number, isSprintWeekend: boolean): number | null {
  if (season < 2010) return null;
  const fastestLap = season >= 2019 && season <= 2024 ? 1 : 0;
  const sprint = !isSprintWeekend ? 0 : season === 2021 ? 3 : season >= 2022 ? 8 : 0;
  return 25 + fastestLap + sprint;
}

export function titleContenders(
  season: number,
  standings: { id: string; points: number }[],
  remainingRounds: { isSprintWeekend: boolean }[],
): string[] | null {
  if (standings.length === 0) return null;
  let remaining = 0;
  for (const r of remainingRounds) {
    const max = maxPointsPerRound(season, r.isSprintWeekend);
    if (max === null) return null;
    remaining += max;
  }
  const leader = Math.max(...standings.map((s) => s.points));
  return standings.filter((s) => s.points + remaining >= leader).map((s) => s.id);
}

/**
 * Puntos recalculados con el sistema actual (HIS-06): 25-18-15-12-10-8-6-4-2-1 en carrera, 8 a 1 en el
 * sprint y sin punto por vuelta rápida; cuentan todas las carreras (sin descartes). Empates por la regla de
 * la FIA: más victorias, luego más segundos puestos, y así sucesivamente. Siempre se rotula como recálculo.
 */
export interface RecalcResult {
  driverId: string;
  kind: "race" | "sprint";
  position: number | null;
}

export interface RecalcRow {
  driverId: string;
  points: number;
  /** Número de carreras terminadas en cada posición (índice 0 = victorias), para el desempate. */
  finishes: number[];
}

export function recalculatePoints(results: RecalcResult[]): RecalcRow[] {
  const rows = new Map<string, RecalcRow>();
  for (const r of results) {
    const row = rows.get(r.driverId) ?? { driverId: r.driverId, points: 0, finishes: [] };
    if (r.position !== null) {
      const table = r.kind === "race" ? RACE_POINTS : SPRINT_POINTS_2022;
      row.points += table[r.position - 1] ?? 0;
      if (r.kind === "race") row.finishes[r.position - 1] = (row.finishes[r.position - 1] ?? 0) + 1;
    }
    rows.set(r.driverId, row);
  }
  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const n = Math.max(a.finishes.length, b.finishes.length);
    for (let i = 0; i < n; i++) {
      const diff = (b.finishes[i] ?? 0) - (a.finishes[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.driverId.localeCompare(b.driverId);
  });
}
