"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { TelemetryData } from "@paddock/analysis";
import { CHART_SIZES, CHART_W, sizeClass, type ChartSize } from "../charts/sizes";

/**
 * Telemetry comparison (TEC-04): speed, throttle, brake and cumulative delta of two drivers' fastest laps,
 * with a synchronised cursor that moves with the pointer or the arrow keys.
 * A circuit map by stretches (TEC-05) and km/h or mph units remembered in the browser (TEC-12).
 */

export interface TelemetryLabels {
  speed: string;
  throttle: string;
  brake: string;
  delta: string;
  units: string;
  map: string;
  mapTable: string;
  segment: string;
  faster: string;
  deltaEstimate: string;
}

const PANEL: Record<ChartSize, { speed: number; throttle: number; brake: number; delta: number }> = {
  wide: { speed: 170, throttle: 70, brake: 40, delta: 110 },
  narrow: { speed: 150, throttle: 64, brake: 36, delta: 100 },
};
const M: Record<ChartSize, { left: number; right: number; gap: number }> = {
  wide: { left: 56, right: 16, gap: 18 },
  narrow: { left: 40, right: 10, gap: 18 },
};
const SEGMENTS = 25;
const UNITS_KEY = "paddock-units";

export function TelemetryView({
  a,
  b,
  labels,
  locale,
}: {
  a: TelemetryData;
  b: TelemetryData;
  labels: TelemetryLabels;
  locale: string;
}) {
  const n = Math.min(a.distance.length, b.distance.length);
  const [index, setIndex] = useState(Math.floor(n / 3));
  const [mph, setMph] = useState(false);

  useEffect(() => {
    try {
      setMph(localStorage.getItem(UNITS_KEY) === "mph");
    } catch {
      // No storage available: km/h by default.
    }
  }, []);
  const toggleUnits = () => {
    setMph((v) => {
      try {
        localStorage.setItem(UNITS_KEY, v ? "kmh" : "mph");
      } catch {
        // Preference not persisted.
      }
      return !v;
    });
  };

  const unit = mph ? "mph" : "km/h";
  const convert = (kmh: number) => (mph ? kmh * 0.621371 : kmh);
  const delta = useMemo(() => a.time.slice(0, n).map((t, i) => b.time[i]! - t), [a, b, n]);

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const stepBy = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight") setIndex((i) => Math.min(n - 1, i + stepBy));
    else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - stepBy));
    else if (e.key === "Home") setIndex(0);
    else if (e.key === "End") setIndex(n - 1);
    else return;
    e.preventDefault();
  };

  const fmt1 = (v: number) => Math.round(v).toString();
  const seconds = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${seconds.format(Math.abs(v))} s`;

  return (
    <div className="stack">
      <div className="controls">
        <button type="button" onClick={toggleUnits} aria-pressed={mph}>
          {labels.units}: {unit}
        </button>
        <span className="muted">{labels.deltaEstimate}</span>
      </div>
      <div className="readout" aria-live="polite">
        <span>{Math.round(a.distance[index]!)} m</span>
        <span className="series series-1">
          {a.driver.code}: {fmt1(convert(a.speed[index]!))} {unit} · {a.throttle[index]}% · G{a.gear[index]}
        </span>
        <span className="series series-4">
          {b.driver.code}: {fmt1(convert(b.speed[index]!))} {unit} · {b.throttle[index]}% · G{b.gear[index]}
        </span>
        <span>
          {labels.delta} {b.driver.code}: {signed(delta[index]!)}
        </span>
      </div>
      <div className="chart-duo">
        {CHART_SIZES.map((size) => (
          <TelemetryPlot
            key={size}
            a={a}
            b={b}
            n={n}
            delta={delta}
            index={index}
            unit={unit}
            labels={labels}
            size={size}
            onIndex={setIndex}
            onKey={onKey}
          />
        ))}
      </div>
      <TrackMap a={a} b={b} labels={labels} index={index} locale={locale} />
    </div>
  );
}

/** One geometry of the four stacked panels (D-37); the cursor index is shared by both. */
function TelemetryPlot({
  a,
  b,
  n,
  delta,
  index,
  unit,
  labels,
  size,
  onIndex,
  onKey,
}: {
  a: TelemetryData;
  b: TelemetryData;
  n: number;
  delta: number[];
  index: number;
  unit: string;
  labels: TelemetryLabels;
  size: ChartSize;
  onIndex: (i: number) => void;
  onKey: (e: KeyboardEvent<SVGSVGElement>) => void;
}) {
  const W = CHART_W[size];
  const m = M[size];
  const panel = PANEL[size];
  const x = scaleLinear().domain([0, a.distance[n - 1]!]).range([m.left, W - m.right]);

  // Room above the first panel for its name, which otherwise sat outside the drawing.
  let top = 16;
  const panels = (["speed", "throttle", "brake", "delta"] as const).map((key) => {
    const p = { key, top, height: panel[key] };
    top += panel[key] + m.gap;
    return p;
  });
  const H = top + 20;

  const ySpeed = scaleLinear()
    .domain([0, Math.max(...a.speed, ...b.speed) + 10])
    .range([panels[0]!.top + panel.speed, panels[0]!.top]);
  const yThrottle = scaleLinear().domain([0, 100]).range([panels[1]!.top + panel.throttle, panels[1]!.top]);
  const yBrake = scaleLinear().domain([0, 1]).range([panels[2]!.top + panel.brake, panels[2]!.top + 4]);
  const maxDelta = Math.max(0.1, ...delta.map(Math.abs));
  const yDelta = scaleLinear().domain([-maxDelta, maxDelta]).range([panels[3]!.top + panel.delta, panels[3]!.top]);

  const path = (values: number[], y: (v: number) => number) =>
    line<number>()
      .x((_, i) => x(a.distance[i]!))
      .y((v) => y(v))(values.slice(0, n)) ?? undefined;

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const d = x.invert(px);
    onIndex(Math.max(0, Math.min(n - 1, Math.round(d / a.step))));
  };
  const cx = x(a.distance[index]!);
  // On the narrow geometry, every other kilometre: "1 km" labels 66 units apart would touch.
  const km = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000].filter((d) => d < a.distance[n - 1]! && (size === "wide" || d % 2000 === 0));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`${sizeClass(size)} telemetry-svg`}
      role="img"
      aria-label={`${labels.speed}, ${labels.throttle}, ${labels.brake}, ${labels.delta}: ${a.driver.name} / ${b.driver.name}`}
      tabIndex={0}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onKeyDown={onKey}
    >
      {panels.map((p) => (
        <text key={p.key} x={m.left - 8} y={p.top + 10} textAnchor="end" className="chart-axis">
          {p.key === "speed" ? unit : p.key === "throttle" ? "%" : p.key === "delta" ? "s" : ""}
        </text>
      ))}
      {panels.map((p) => (
        <text key={`l-${p.key}`} x={m.left} y={p.top - 4} className="chart-axis">
          {labels[p.key]}
        </text>
      ))}
      <line x1={m.left} x2={W - m.right} y1={yDelta(0)} y2={yDelta(0)} className="chart-baseline-line" />
      <g className="series series-1">
        <path d={path(a.speed, ySpeed)} className="series-line" />
        <path d={path(a.throttle, yThrottle)} className="series-line" />
        <path d={path(a.brake, yBrake)} className="series-line" />
      </g>
      <g className="series series-4">
        <path d={path(b.speed, ySpeed)} className="series-line" />
        <path d={path(b.throttle, yThrottle)} className="series-line" />
        <path d={path(b.brake, yBrake)} className="series-line" />
        <path d={path(delta, yDelta)} className="series-line" />
      </g>
      {km.map((d) => (
        <text key={d} x={x(d)} y={H - 4} textAnchor="middle" className="chart-axis">
          {d === 0 ? "0" : `${d / 1000} km`}
        </text>
      ))}
      <line x1={cx} x2={cx} y1={0} y2={H - 20} className="crosshair" />
    </svg>
  );
}

/** The circuit map with each stretch in the colour of the driver fastest there (TEC-05), and its table. */
function TrackMap({
  a,
  b,
  labels,
  index,
  locale,
}: {
  a: TelemetryData;
  b: TelemetryData;
  labels: TelemetryLabels;
  index: number;
  locale: string;
}) {
  const seconds = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const n = Math.min(a.distance.length, b.distance.length);
  const size = Math.ceil(n / SEGMENTS);
  const xs = a.x.slice(0, n);
  const ys = a.y.slice(0, n);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(360 / (maxX - minX || 1), 260 / (maxY - minY || 1));
  const px = (i: number) => 20 + (xs[i]! - minX) * scale;
  const py = (i: number) => 280 - (ys[i]! - minY) * scale;

  const segments = Array.from({ length: SEGMENTS }, (_, s) => {
    const from = s * size;
    const to = Math.min(n - 1, from + size);
    const ta = a.time[to]! - a.time[from]!;
    const tb = b.time[to]! - b.time[from]!;
    return { s, from, to, faster: ta <= tb ? a : b, gap: Math.abs(ta - tb) };
  }).filter((seg) => seg.to > seg.from);

  return (
    <figure className="chart stack-s">
      <svg viewBox="0 0 400 300" className="chart-svg track-map" role="img" aria-label={labels.map}>
        {segments.map((seg) => (
          <polyline
            key={seg.s}
            className={`track-path ${seg.faster === a ? "track-a" : "track-b"}`}
            points={Array.from({ length: seg.to - seg.from + 1 }, (_, k) => `${px(seg.from + k)},${py(seg.from + k)}`).join(" ")}
          />
        ))}
        <circle cx={px(Math.min(index, n - 1))} cy={py(Math.min(index, n - 1))} r={6} className="track-cursor" />
      </svg>
      <figcaption className="legend">
        <span className="legend-item series series-1">■ {labels.faster.replace("{name}", a.driver.name)}</span>
        <span className="legend-item series series-4">■ {labels.faster.replace("{name}", b.driver.name)}</span>
      </figcaption>
      <details>
        <summary>{labels.mapTable}</summary>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={labels.mapTable}>
          <table>
            <thead>
              <tr>
                <th scope="col">{labels.segment}</th>
                <th scope="col">m</th>
                <th scope="col">{labels.faster.replace("{name}", "")}</th>
                <th scope="col" className="num">s</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr key={seg.s}>
                  <th scope="row">{seg.s + 1}</th>
                  <td className="tabular">
                    {Math.round(a.distance[seg.from]!)}–{Math.round(a.distance[seg.to]!)}
                  </td>
                  <td>{seg.faster.driver.code}</td>
                  <td className="num">{seconds.format(seg.gap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
