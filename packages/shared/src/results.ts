/** Calculations derived from results, shared by the API and the web app. */

/** The driver saw the chequered flag: "Finished", "+1 Lap", "+3 Laps" or "Lapped". */
export function finished(status: string): boolean {
  return status === "Finished" || status === "Lapped" || /^\+\d+ Laps?$/.test(status);
}

/**
 * Positions gained against the grid (NUC-22): grid minus final position.
 * No value if the driver started from the pit lane (grid 0) or did not finish.
 */
export function positionsGained(grid: number | null, position: number | null, status: string): number | null {
  if (grid === null || grid === 0 || position === null || !finished(status)) return null;
  return grid - position;
}

/** Points gap to the leader (NUC-32). */
export function gapsToLeader(points: number[]): number[] {
  const leader = points.length ? Math.max(...points) : 0;
  return points.map((p) => leader - p);
}
