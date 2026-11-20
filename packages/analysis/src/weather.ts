import type { OpenF1Weather } from "@paddock/shared/openf1";
import type { WeatherSummary } from "./types";

/** Session weather (NUC-27): minimum and maximum air and track temperature, and whether it rained at any point. */
export function weatherSummary(samples: OpenF1Weather[]): WeatherSummary | null {
  if (samples.length === 0) return null;
  const range = (values: (number | null | undefined)[]): [number, number] | null => {
    const v = values.filter((x): x is number => typeof x === "number");
    return v.length ? [Math.round(Math.min(...v) * 10) / 10, Math.round(Math.max(...v) * 10) / 10] : null;
  };
  return {
    air: range(samples.map((s) => s.air_temperature)),
    track: range(samples.map((s) => s.track_temperature)),
    rain: samples.some((s) => (s.rainfall ?? 0) > 0),
  };
}
