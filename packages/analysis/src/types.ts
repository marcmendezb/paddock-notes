/**
 * Formato de los JSON de análisis que se guardan en R2 (stack.md §7) y sirve la API.
 * Los textos no van aquí: la web redacta las notas automáticas a partir de `facts` (TEC-08), en cada idioma.
 */

export const ANALYSIS_VERSION = 1;

/** Ruta de un JSON de análisis en R2: analysis/{season}/{round}/v{n}/{file}.json (stack.md §8.2). */
export const analysisKey = (season: number, round: number, file: string, version = ANALYSIS_VERSION) =>
  `analysis/${season}/${round}/v${version}/${file}.json`;

export type ToolName = "strategy" | "pace" | "telemetry" | "sectors" | "replay";

export interface DriverInfo {
  number: number;
  code: string;
  name: string;
  team: string | null;
  /** Posición final, si terminó clasificado. */
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

export interface PaceData {
  laps: number;
  neutralised: NeutralisedPeriod[];
  drivers: (DriverInfo & {
    laps: { lap: number; time: number; stint: number; excluded: "pit" | "neutralised" | "first" | null }[];
    /** Media y pendiente (s por vuelta) de cada stint, sin vueltas excluidas. */
    stints: { stint: number; fromLap: number; toLap: number; mean: number | null; slope: number | null }[];
  })[];
}

export interface TelemetryData {
  driver: DriverInfo;
  lap: number;
  lapTime: number;
  /** Muestras remuestreadas cada `step` metros. */
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
