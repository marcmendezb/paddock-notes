import type { OpenF1Lap } from "@paddock/shared/openf1";
import { isNeutralised } from "./neutralised";
import type { DriverInfo, NeutralisedPeriod, SectorsData } from "./types";

/** Sectors (TEC-06): each driver's best time and mean per sector, without neutralised or pit laps. */
export function sectors(
  drivers: DriverInfo[],
  laps: OpenF1Lap[],
  pitLaps: Map<number, number[]>,
  neutralised: NeutralisedPeriod[],
): SectorsData {
  const rows = drivers.map((d) => {
    const inLaps = new Set(pitLaps.get(d.number) ?? []);
    const clean = laps.filter(
      (l) =>
        l.driver_number === d.number &&
        l.lap_number > 1 &&
        !l.is_pit_out_lap &&
        !inLaps.has(l.lap_number) &&
        !isNeutralised(l.lap_number, neutralised),
    );
    const sector = (l: OpenF1Lap, i: number) => [l.duration_sector_1, l.duration_sector_2, l.duration_sector_3][i] ?? null;
    const best = [0, 1, 2].map((i) => min(clean.map((l) => sector(l, i))));
    const average = [0, 1, 2].map((i) => mean(clean.map((l) => sector(l, i))));
    const bestLap = min(clean.map((l) => l.lap_duration ?? null));
    return { ...d, best, average, bestLap };
  });
  const best = [0, 1, 2].map((i) => min(rows.map((r) => r.best[i] ?? null)));
  return {
    drivers: rows,
    best,
    facts: {
      fastestBySector: best.map((b, i) => (b === null ? null : (rows.find((r) => r.best[i] === b)?.code ?? null))),
    },
  };
}

function min(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v > 0);
  return valid.length ? Math.min(...valid) : null;
}

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v > 0);
  return valid.length ? Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 1000) / 1000 : null;
}
