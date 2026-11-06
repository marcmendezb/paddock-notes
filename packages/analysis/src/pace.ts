import type { OpenF1Lap, OpenF1Stint } from "@paddock/shared/openf1";
import { isNeutralised } from "./neutralised";
import type { DriverInfo, NeutralisedPeriod, PaceData } from "./types";

/**
 * Ritmo de carrera (TEC-03): tiempo de cada vuelta, con las vueltas que distorsionan la comparación
 * marcadas (salida, entrada y salida de boxes, coche de seguridad), y media y pendiente por stint.
 */
export function pace(
  drivers: DriverInfo[],
  laps: OpenF1Lap[],
  stints: OpenF1Stint[],
  pitLaps: Map<number, number[]>,
  totalLaps: number,
  neutralised: NeutralisedPeriod[],
): PaceData {
  return {
    laps: totalLaps,
    neutralised,
    drivers: drivers.map((d) => {
      const own = stints.filter((s) => s.driver_number === d.number && s.lap_start != null);
      const stintOf = (lap: number) =>
        own.find((s) => lap >= s.lap_start! && lap <= (s.lap_end ?? s.lap_start!))?.stint_number ?? 0;
      const inLaps = new Set(pitLaps.get(d.number) ?? []);
      const rows = laps
        .filter((l) => l.driver_number === d.number && l.lap_duration != null)
        .sort((a, b) => a.lap_number - b.lap_number)
        .map((l) => ({
          lap: l.lap_number,
          time: round3(l.lap_duration!),
          stint: stintOf(l.lap_number),
          excluded:
            l.lap_number === 1
              ? ("first" as const)
              : l.is_pit_out_lap || inLaps.has(l.lap_number)
                ? ("pit" as const)
                : isNeutralised(l.lap_number, neutralised)
                  ? ("neutralised" as const)
                  : null,
        }));
      const stintSummaries = own
        .sort((a, b) => a.stint_number - b.stint_number)
        .map((s) => {
          const clean = rows.filter((r) => r.stint === s.stint_number && r.excluded === null);
          const fit = linearFit(clean.map((r) => [r.lap, r.time]));
          return {
            stint: s.stint_number,
            fromLap: s.lap_start!,
            toLap: s.lap_end ?? s.lap_start!,
            mean: clean.length ? round3(clean.reduce((sum, r) => sum + r.time, 0) / clean.length) : null,
            slope: fit ? round3(fit.slope) : null,
          };
        });
      return { ...d, laps: rows, stints: stintSummaries };
    }),
  };
}

/** Recta de mínimos cuadrados; null con menos de 3 puntos. */
export function linearFit(points: [number, number][]): { slope: number; intercept: number } | null {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of points) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;
