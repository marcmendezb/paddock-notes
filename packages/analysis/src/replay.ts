import type { OpenF1Lap, OpenF1Position } from "@paddock/shared/openf1";
import type { DriverInfo, ReplayData } from "./types";

/**
 * Posiciones vuelta a vuelta (TEC-07): la posición de cada piloto al cerrar cada vuelta del líder.
 * Se toma la última posición registrada antes del final de esa vuelta.
 */
export function replay(drivers: DriverInfo[], laps: OpenF1Lap[], positions: OpenF1Position[], totalLaps: number): ReplayData {
  const leaderLapEnds: number[] = [];
  for (let lap = 1; lap <= totalLaps; lap++) {
    const ends = laps
      .filter((l) => l.lap_number === lap && l.date_start && l.lap_duration)
      .map((l) => Date.parse(l.date_start!) + l.lap_duration! * 1000);
    leaderLapEnds.push(ends.length ? Math.min(...ends) : Number.NaN);
  }
  const events = [...positions].sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ ...p, t: Date.parse(p.date) }));
  const lastLap = new Map<number, number>();
  for (const l of laps) lastLap.set(l.driver_number, Math.max(lastLap.get(l.driver_number) ?? 0, l.lap_number));

  return {
    laps: totalLaps,
    drivers: drivers.map((d) => {
      const own = events.filter((e) => e.driver_number === d.number);
      return {
        ...d,
        positions: leaderLapEnds.map((end, i) => {
          // Tras abandonar, sin posición.
          if (Number.isNaN(end) || i + 1 > (lastLap.get(d.number) ?? 0)) return null;
          let pos: number | null = null;
          for (const e of own) {
            if (e.t > end) break;
            pos = e.position;
          }
          return pos;
        }),
      };
    }),
  };
}
