import type { OpenF1CarData, OpenF1Location } from "@paddock/shared/openf1";
import type { DriverInfo, TelemetryData } from "./types";

/**
 * Reduced telemetry for one lap (TEC-04): distance by integrating speed, a sample every `step` metres and
 * coordinates interpolated in time. About 430 points for a 4.3 km lap: within the 300 kB budget per view
 * (TEC-13) with two drivers.
 */
export function telemetry(
  driver: DriverInfo,
  lap: number,
  lapStart: string,
  lapTime: number,
  car: OpenF1CarData[],
  location: OpenF1Location[],
  step = 10,
): TelemetryData | null {
  const start = Date.parse(lapStart);
  const samples = [...car].sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ ...c, t: (Date.parse(c.date) - start) / 1000 }));
  if (samples.length < 20) return null;

  // Cumulative distance (m) by the trapezoidal rule over speed (km/h).
  const dist: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i]!.t - samples[i - 1]!.t;
    dist.push(dist[i - 1]! + (dt * (samples[i]!.speed + samples[i - 1]!.speed)) / 2 / 3.6);
  }
  const locs = [...location].sort((a, b) => a.date.localeCompare(b.date)).map((l) => ({ ...l, t: (Date.parse(l.date) - start) / 1000 }));

  const out: TelemetryData = {
    driver,
    lap,
    lapTime,
    step,
    distance: [],
    time: [],
    speed: [],
    throttle: [],
    brake: [],
    gear: [],
    x: [],
    y: [],
  };
  let j = 0;
  for (let d = 0; d <= dist.at(-1)!; d += step) {
    while (j < dist.length - 2 && dist[j + 1]! < d) j++;
    const a = samples[j]!;
    const b = samples[j + 1]!;
    const f = dist[j + 1]! > dist[j]! ? (d - dist[j]!) / (dist[j + 1]! - dist[j]!) : 0;
    const t = a.t + (b.t - a.t) * f;
    const pos = interpolateLocation(locs, t);
    out.distance.push(d);
    out.time.push(round(t, 3));
    out.speed.push(Math.round(a.speed + (b.speed - a.speed) * f));
    out.throttle.push(Math.round(f < 0.5 ? a.throttle : b.throttle));
    // OpenF1 gives the brake as 0 or 100: stored as 0/1.
    out.brake.push((f < 0.5 ? a.brake : b.brake) > 0 ? 1 : 0);
    out.gear.push(f < 0.5 ? a.n_gear : b.n_gear);
    out.x.push(pos ? Math.round(pos.x) : 0);
    out.y.push(pos ? Math.round(pos.y) : 0);
  }
  return out;
}

function interpolateLocation(locs: { t: number; x: number; y: number }[], t: number) {
  if (locs.length === 0) return null;
  let i = 0;
  while (i < locs.length - 2 && locs[i + 1]!.t < t) i++;
  const a = locs[i]!;
  const b = locs[i + 1] ?? a;
  const f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

/**
 * Cumulative time difference of B against A along the lap (positive: B slower).
 * It is an estimate: it comes from the distance integrated from speed.
 */
export function delta(a: TelemetryData, b: TelemetryData): { distance: number[]; delta: number[] } {
  const n = Math.min(a.distance.length, b.distance.length);
  const distance = a.distance.slice(0, n);
  return { distance, delta: distance.map((_, i) => round(b.time[i]! - a.time[i]!, 3)) };
}

/**
 * A circuit layout (NUC-43, D-09) from the coordinates of one lap: normalised to a 0 to 1000 box and
 * reduced to one point every `every` metres. The SVG is drawn in the web app.
 */
/** Version of the braking detection: part of the layout's cache key. Bump it when it changes. */
export const CORNERS_VERSION = 4;

export interface BrakingZone {
  /** Order in the lap, from the finish line. */
  n: number;
  /** Position in the lap, from 0 to 1 (to match editorial notes even if the measured length changes). */
  at: number;
  /** Minimum speed (km/h) and gear at that point. */
  speed: number;
  gear: number;
  /** Index of the sample, to place it on the layout. */
  index: number;
}

/**
 * Heavy braking zones in a lap (NUC-44): local minima of the smoothed speed that sit at least `minDrop`
 * km/h below the fastest point in the `window` metres before and after. Two minima less than `merge`
 * metres apart (a chicane) count as one, the slower. They are not the official corners: a flat-out corner
 * does not appear, because there is no braking.
 */
export function brakingZones(t: TelemetryData, { minDrop = 20, window = 600, merge = 120 } = {}): BrakingZone[] {
  const n = t.speed.length;
  if (n < 20) return [];
  const smooth = t.speed.map((_, i) => {
    const slice = t.speed.slice(Math.max(0, i - 2), i + 3);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const reach = Math.max(1, Math.round(window / t.step));
  const found: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (!(smooth[i]! <= smooth[i - 1]! && smooth[i]! < smooth[i + 1]!)) continue;
    const before = Math.max(...smooth.slice(Math.max(0, i - reach), i));
    const after = Math.max(...smooth.slice(i + 1, i + 1 + reach));
    if (Math.min(before, after) - smooth[i]! < minDrop) continue;
    const prev = found.at(-1);
    if (prev !== undefined && t.distance[i]! - t.distance[prev]! < merge) {
      if (smooth[i]! < smooth[prev]!) found[found.length - 1] = i;
      continue;
    }
    found.push(i);
  }
  // Smoothing shifts the minimum (in a chicane it lands on the rise between the two apexes): each zone is
  // snapped to the slowest real sample around it.
  const around = Math.max(1, Math.round(merge / t.step));
  const refined: number[] = [];
  for (const i of found) {
    let best = i;
    for (let j = Math.max(0, i - around); j <= Math.min(n - 1, i + around); j++) if (t.speed[j]! < t.speed[best]!) best = j;
    // After snapping, two nearby zones can land almost on the same spot: they count as one, the slower.
    const prev = refined.at(-1);
    if (prev !== undefined && t.distance[best]! - t.distance[prev]! < merge) {
      if (t.speed[best]! < t.speed[prev]!) refined[refined.length - 1] = best;
      continue;
    }
    if (prev === undefined || best > prev) refined.push(best);
  }
  const length = t.distance.at(-1) || 1;
  return refined.map((i, k) => ({
    n: k + 1,
    at: Math.round((t.distance[i]! / length) * 1000) / 1000,
    speed: Math.round(t.speed[i]!),
    gear: t.gear[i] ?? 0,
    index: i,
  }));
}

export interface CircuitLayout {
  points: [number, number][];
  /** Second of the lap at which each point is passed: lets the layout be run at the real pace. */
  times: number[];
  /** Speed (km/h) at each point: the layout is coloured with it. */
  speeds: number[];
  length: number;
  lapTime: number;
  driver: { code: string; name: string };
  corners: (Omit<BrakingZone, "index"> & { point: [number, number] })[];
}

export function circuitLayout(t: TelemetryData, every = 40): CircuitLayout {
  const step = Math.max(1, Math.round(every / t.step));
  const xs = t.x;
  const ys = t.y;
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = 1000 / Math.max(maxX - minX, maxY - minY, 1);
  // The coordinates' y axis grows upwards; in SVG, downwards.
  const project = (i: number): [number, number] => [Math.round((xs[i]! - minX) * scale), Math.round((maxY - ys[i]!) * scale)];
  const points: [number, number][] = [];
  const times: number[] = [];
  const speeds: number[] = [];
  for (let i = 0; i < xs.length; i += step) {
    points.push(project(i));
    times.push(Math.round((t.time[i] ?? 0) * 100) / 100);
    speeds.push(Math.round(t.speed[i] ?? 0));
  }
  const corners = brakingZones(t).map(({ index, ...zone }) => ({ ...zone, point: project(index) }));
  return {
    points,
    times,
    speeds,
    length: Math.round(t.distance.at(-1) ?? 0),
    lapTime: t.lapTime,
    driver: { code: t.driver.code, name: t.driver.name },
    corners,
  };
}
