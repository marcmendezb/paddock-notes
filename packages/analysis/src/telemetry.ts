import type { OpenF1CarData, OpenF1Location } from "@paddock/shared/openf1";
import type { DriverInfo, TelemetryData } from "./types";

/**
 * Telemetría reducida de una vuelta (TEC-04): distancia por integración de la velocidad, muestras cada
 * `step` metros y coordenadas interpoladas en el tiempo. Unos 430 puntos por vuelta de 4,3 km: cumple el
 * presupuesto de 300 kB por vista (TEC-13) con dos pilotos.
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

  // Distancia acumulada (m) por la regla del trapecio sobre la velocidad (km/h).
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
    // OpenF1 da el freno como 0 o 100: se guarda como 0/1.
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
 * Diferencia de tiempo acumulada de B respecto a A a lo largo de la vuelta (positivo: B más lento).
 * Es una estimación: sale de la distancia integrada a partir de la velocidad.
 */
export function delta(a: TelemetryData, b: TelemetryData): { distance: number[]; delta: number[] } {
  const n = Math.min(a.distance.length, b.distance.length);
  const distance = a.distance.slice(0, n);
  return { distance, delta: distance.map((_, i) => round(b.time[i]! - a.time[i]!, 3)) };
}

/**
 * Trazado de un circuito (NUC-43, D-09) a partir de las coordenadas de una vuelta: se normaliza a una
 * caja de 0 a 1000 y se reduce a un punto cada `every` metros. El SVG se dibuja en la web.
 */
export interface BrakingZone {
  /** Orden en la vuelta, desde la línea de meta. */
  n: number;
  /** Posición en la vuelta, de 0 a 1 (para casar notas editoriales aunque cambie la longitud medida). */
  at: number;
  /** Velocidad mínima (km/h) y marcha en ese punto. */
  speed: number;
  gear: number;
  /** Índice de la muestra, para situarla en el trazado. */
  index: number;
}

/**
 * Frenadas fuertes de una vuelta (NUC-44): mínimos locales de la velocidad suavizada que quedan al menos
 * `minDrop` km/h por debajo de lo más rápido de los `window` metros anteriores y posteriores. Dos mínimos a
 * menos de `merge` metros (una chicane) cuentan como uno, el más lento. No son las curvas oficiales:
 * una curva a fondo no aparece, porque no hay frenada.
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
  // El suavizado desplaza el mínimo (en una chicane cae en el repunte entre los dos vértices): cada zona se
  // ajusta a la muestra real más lenta de su entorno.
  const around = Math.max(1, Math.round(merge / t.step));
  const refined = found.map((i) => {
    let best = i;
    for (let j = Math.max(0, i - around); j <= Math.min(n - 1, i + around); j++) if (t.speed[j]! < t.speed[best]!) best = j;
    return best;
  });
  const length = t.distance.at(-1) || 1;
  return refined.map((i, k) => ({
    n: k + 1,
    at: Math.round((t.distance[i]! / length) * 1000) / 1000,
    speed: Math.round(t.speed[i]!),
    gear: t.gear[i] ?? 0,
    index: i,
  }));
}

export function circuitLayout(
  t: TelemetryData,
  every = 40,
): { points: [number, number][]; length: number; corners: (Omit<BrakingZone, "index"> & { point: [number, number] })[] } {
  const step = Math.max(1, Math.round(every / t.step));
  const xs = t.x;
  const ys = t.y;
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = 1000 / Math.max(maxX - minX, maxY - minY, 1);
  // El eje y de las coordenadas crece hacia arriba; en SVG, hacia abajo.
  const project = (i: number): [number, number] => [Math.round((xs[i]! - minX) * scale), Math.round((maxY - ys[i]!) * scale)];
  const points: [number, number][] = [];
  for (let i = 0; i < xs.length; i += step) points.push(project(i));
  const corners = brakingZones(t).map(({ index, ...zone }) => ({ ...zone, point: project(index) }));
  return { points, length: Math.round(t.distance.at(-1) ?? 0), corners };
}
