import type { OpenF1Pit, OpenF1Stint } from "@paddock/shared/openf1";
import type { Compound, DriverInfo, NeutralisedPeriod, StrategyData } from "./types";

const COMPOUNDS: Compound[] = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];
const toCompound = (value: string | null | undefined): Compound =>
  COMPOUNDS.includes(value as Compound) ? (value as Compound) : "UNKNOWN";

/** Tyre strategy (TEC-02): stints per driver, stops and neutralised periods. */
export function strategy(
  drivers: DriverInfo[],
  stints: OpenF1Stint[],
  pits: OpenF1Pit[],
  laps: number,
  neutralised: NeutralisedPeriod[],
): StrategyData {
  const rows = drivers.map((d) => {
    const own = stints
      .filter((s) => s.driver_number === d.number && s.lap_start != null)
      .sort((a, b) => a.stint_number - b.stint_number)
      .map((s) => ({
        compound: toCompound(s.compound),
        fromLap: s.lap_start!,
        toLap: s.lap_end ?? s.lap_start!,
        tyreAge: s.tyre_age_at_start ?? 0,
      }));
    // Stops: pit lane laps except lap 1 (a pit lane start or the formation lap).
    const pitLaps = [
      ...new Set(
        pits
          .filter((p) => p.driver_number === d.number && p.lap_number != null && p.lap_number > 1)
          .map((p) => p.lap_number!),
      ),
    ].sort((a, b) => a - b);
    return { ...d, stints: own, pitLaps };
  });

  const stops: Record<string, number> = {};
  for (const r of rows) {
    if (r.finish === null || r.stints.length === 0) continue;
    const key = String(Math.max(0, r.stints.length - 1));
    stops[key] = (stops[key] ?? 0) + 1;
  }
  const winner = rows.find((r) => r.finish === 1);
  return {
    laps,
    neutralised,
    drivers: rows,
    facts: { stops, winnerCompounds: winner?.stints.map((s) => s.compound) ?? [] },
  };
}
