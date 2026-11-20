/**
 * Format of the analysis JSON stored in KV (stack.md §7, D-39) and served by the API.
 * No copy here: the web app writes the automatic notes from `facts` (TEC-08), in each language.
 */

/**
 * Version of the format and the computations. When it goes up, ingestion analyses again the races with an
 * older version. v2: anomalous slow laps excluded from pace and the trend anchored to real laps.
 */
export const ANALYSIS_VERSION = 2;

/** Path (KV key) of an analysis JSON: analysis/{season}/{round}/v{n}/{file}.json (stack.md §8.2). */
export const analysisKey = (season: number, round: number, file: string, version = ANALYSIS_VERSION) =>
  `analysis/${season}/${round}/v${version}/${file}.json`;

export type ToolName = "strategy" | "pace" | "telemetry" | "sectors" | "replay";

export interface DriverInfo {
  number: number;
  code: string;
  name: string;
  team: string | null;
  /** Final position, if the driver was classified. */
  finish: number | null;
}

export interface NeutralisedPeriod {
  kind: "SC" | "VSC" | "RED";
  fromLap: number;
  toLap: number;
}

export type Compound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | "UNKNOWN";

export interface StrategyData {
  laps: number;
  neutralised: NeutralisedPeriod[];
  drivers: (DriverInfo & {
    stints: { compound: Compound; fromLap: number; toLap: number; tyreAge: number }[];
    pitLaps: number[];
  })[];
  facts: { stops: Record<string, number>; winnerCompounds: Compound[] };
}

/**
 * Why a lap does not count for pace: the start, the pits, a neutralisation or, since v2, `slow`: more than
 * 7 % above the driver's median (the restart lap after a red flag, a spin).
 */
export type PaceExclusion = "pit" | "neutralised" | "first" | "slow";

export interface PaceData {
  laps: number;
  neutralised: NeutralisedPeriod[];
  drivers: (DriverInfo & {
    laps: { lap: number; time: number; stint: number; excluded: PaceExclusion | null }[];
    /**
     * Mean and slope (s per lap) of each stint, without excluded laps. `trend`: the fitted line between the
     * first and last clean lap of the stint, [lap, time, lap, time] (since v2).
     */
    stints: {
      stint: number;
      fromLap: number;
      toLap: number;
      mean: number | null;
      slope: number | null;
      trend?: [number, number, number, number] | null;
    }[];
  })[];
}

export interface TelemetryData {
  driver: DriverInfo;
  lap: number;
  lapTime: number;
  /** Samples resampled every `step` metres. */
  step: number;
  distance: number[];
  time: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  gear: number[];
  x: number[];
  y: number[];
}

export interface SectorsData {
  drivers: (DriverInfo & { best: (number | null)[]; average: (number | null)[]; bestLap: number | null })[];
  best: (number | null)[];
  facts: { fastestBySector: (string | null)[] };
}

export interface ReplayData {
  laps: number;
  drivers: (DriverInfo & { positions: (number | null)[] })[];
}

export interface WeatherSummary {
  air: [number, number] | null;
  track: [number, number] | null;
  rain: boolean;
}

export interface AnalysisIndex {
  season: number;
  round: number;
  version: number;
  sessionKey: number;
  tools: ToolName[];
  telemetryDrivers: number[];
  weather?: WeatherSummary | null;
  createdAt: string;
}
