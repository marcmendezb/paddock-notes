/** Cálculos derivados de los resultados, compartidos por la API y la web. */

/** El piloto vio la bandera a cuadros: "Finished", "+1 Lap", "+3 Laps" o "Lapped". */
export function finished(status: string): boolean {
  return status === "Finished" || status === "Lapped" || /^\+\d+ Laps?$/.test(status);
}

/**
 * Posiciones ganadas respecto a la parrilla (NUC-22): parrilla − posición final.
 * Sin valor si salió desde boxes (parrilla 0) o no terminó.
 */
export function positionsGained(grid: number | null, position: number | null, status: string): number | null {
  if (grid === null || grid === 0 || position === null || !finished(status)) return null;
  return grid - position;
}

/** Diferencia de puntos con el líder (NUC-32). */
export function gapsToLeader(points: number[]): number[] {
  const leader = points.length ? Math.max(...points) : 0;
  return points.map((p) => leader - p);
}
