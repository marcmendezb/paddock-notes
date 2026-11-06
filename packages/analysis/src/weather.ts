import type { OpenF1Weather } from "@paddock/shared/openf1";
import type { WeatherSummary } from "./types";

/** Clima de la sesión (NUC-27): mínimo y máximo de aire y pista, y si llovió en algún momento. */
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
