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
      const marked = markSlowLaps(rows);
      const stintSummaries = stintStats(
        marked,
        own
          .sort((a, b) => a.stint_number - b.stint_number)
          .map((s) => ({ stint: s.stint_number, fromLap: s.lap_start!, toLap: s.lap_end ?? s.lap_start! })),
      );
      return { ...d, laps: marked, stints: stintSummaries };
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

type PaceLap = PaceData["drivers"][number]["laps"][number];
type PaceStint = PaceData["drivers"][number]["stints"][number];

/** Margen sobre la mediana del piloto a partir del cual una vuelta es anómala y no cuenta para el ritmo. */
const SLOW_FACTOR = 1.07;

/** Marca como `slow` las vueltas limpias mucho más lentas que la mediana del piloto. */
export function markSlowLaps(laps: PaceLap[]): PaceLap[] {
  const clean = laps.filter((l) => l.excluded === null).map((l) => l.time).sort((a, b) => a - b);
  if (clean.length === 0) return laps;
  const median = clean[Math.floor(clean.length / 2)]!;
  return laps.map((l) => (l.excluded === null && l.time > median * SLOW_FACTOR ? { ...l, excluded: "slow" as const } : l));
}

/** Media, pendiente y recta de tendencia de cada stint con sus vueltas limpias. */
export function stintStats(laps: PaceLap[], stints: { stint: number; fromLap: number; toLap: number }[]): PaceStint[] {
  return stints.map((s) => {
    const clean = laps.filter((r) => r.stint === s.stint && r.excluded === null);
    const fit = linearFit(clean.map((r) => [r.lap, r.time]));
    const first = clean[0];
    const last = clean.at(-1);
    return {
      ...s,
      mean: clean.length ? round3(clean.reduce((sum, r) => sum + r.time, 0) / clean.length) : null,
      slope: fit ? round3(fit.slope) : null,
      trend:
        fit && first && last && last.lap > first.lap
          ? [first.lap, round3(fit.intercept + fit.slope * first.lap), last.lap, round3(fit.intercept + fit.slope * last.lap)]
          : null,
    };
  });
}

/**
 * Recalcula las vueltas anómalas y las estadísticas de un análisis ya guardado: los de la v1 no excluían
 * las vueltas lentas. Sirve para pintar bien lo que hay en R2 mientras se vuelve a analizar.
 */
export function repairPace(data: PaceData): PaceData {
  return {
    ...data,
    drivers: data.drivers.map((d) => {
      const laps = markSlowLaps(d.laps);
      return { ...d, laps, stints: stintStats(laps, d.stints) };
    }),
  };
}
