import type { ReactNode } from "react";
import { IconPaths } from "./icons";

export interface LapLayout {
  points: [number, number][];
  times: number[];
  speeds: number[];
  lapTime: number;
  corners: { n: number; at: number; speed: number; gear: number; point: [number, number] }[];
}

const r1 = (v: number) => Math.round(v * 10) / 10;
/** Speed stretches: from dark lime (slow) to light lime (fast), the brand's sequential scale. */
const BUCKETS = 5;
/** The car's trail: copies following behind, ever smaller and more transparent. */
const TRAIL = [0.07, 0.14, 0.21, 0.28];

/**
 * A real lap (home hero): the next circuit's layout coloured by the speed of the fastest lap (brand.md §5,
 * "speed on the map") and a lime square (the logo's dot) running it at the real pace, with a trail. Each
 * stretch lasts as long as it did in the telemetry (keyPoints/keyTimes): it brakes where the car braked.
 * A speedometer below moves in sync with it.
 *
 * Native SVG animation and CSS: no JavaScript and no inline styles (CSP, D-04). The layout passes over the
 * Grand Prix name with a halo in the background colour, which cuts the letters. Decorative for screen
 * readers: the name and the details are in the text.
 */
export function LapStage({
  layout,
  labels,
  children,
}: {
  layout: LapLayout;
  labels: { slowest: string; speed: string };
  children: ReactNode;
}) {
  const { points, times, speeds, lapTime } = layout;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 56;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  const path = `M${points.map((p) => p.join(",")).join("L")}Z`;

  // Position of each point along the path (fraction of the closed polygon's length)…
  const closed = [...points, points[0]!];
  const cumulative = [0];
  for (let i = 1; i < closed.length; i++) {
    const [ax, ay] = closed[i - 1]!;
    const [bx, by] = closed[i]!;
    cumulative.push(cumulative[i - 1]! + Math.hypot(bx - ax, by - ay));
  }
  const total = cumulative.at(-1)! || 1;
  // …and the moment of the lap at which it is passed. The lap closes on the first point.
  const t0 = times[0] ?? 0;
  const keyTimes = [...times.map((t) => Math.min(1, Math.max(0, (t - t0) / lapTime))), 1];
  const synced =
    keyTimes[0] === 0 && keyTimes.every((t, i) => i === 0 || t >= keyTimes[i - 1]!) && speeds.length === points.length;
  const keyPoints = cumulative.map((d) => (d / total).toFixed(4)).join(";");
  const keyTimesAttr = keyTimes.map((k) => k.toFixed(4)).join(";");
  const dur = `${r1(lapTime)}s`;
  const motion = (begin = "0s") =>
    synced ? (
      <animateMotion
        dur={dur}
        begin={begin}
        repeatCount="indefinite"
        rotate="auto"
        calcMode="linear"
        path={path}
        keyPoints={keyPoints}
        keyTimes={keyTimesAttr}
      />
    ) : (
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" rotate="auto" path={path} />
    );

  const lo = speeds.length ? Math.min(...speeds) : 0;
  const hi = speeds.length ? Math.max(...speeds) : 1;
  const bucket = (v: number) => 1 + Math.min(BUCKETS - 1, Math.floor(((v - lo) / Math.max(1, hi - lo)) * BUCKETS));
  const slowest = layout.corners.reduce<LapLayout["corners"][number] | null>(
    (min, c) => (!min || c.speed < min.speed ? c : min),
    null,
  );
  const [sx, sy] = points[0]!;
  const inner = (x: number) => x > minX + w / 2;

  return (
    <div className="lap-stage">
      {children}
      <div className="lap-visual">
        <svg className="lap-figure" viewBox={`${minX} ${minY} ${w} ${h}`} aria-hidden="true" focusable="false">
          <defs>
            {/* A mask that reveals the track from start to finish on load. */}
            <mask id="lap-reveal" maskUnits="userSpaceOnUse" x={minX} y={minY} width={w} height={h}>
              <path d={path} pathLength={1} className="lap-reveal" />
            </mask>
          </defs>
          <path d={path} className="lap-halo" />
          <g mask="url(#lap-reveal)">
            {points.map((p, i) => {
              const q = points[(i + 1) % points.length]!;
              return (
                <line
                  key={i}
                  x1={p[0]}
                  y1={p[1]}
                  x2={q[0]}
                  y2={q[1]}
                  className={`lap-seg lap-seg-${bucket(speeds[i] ?? lo)}`}
                />
              );
            })}
          </g>
          {layout.corners.map((c) => (
            <g key={c.n} className="lap-corner">
              <circle cx={c.point[0]} cy={c.point[1]} r={15} />
              <text x={c.point[0]} y={c.point[1]} dy="0.36em" textAnchor="middle">
                {c.n}
              </text>
            </g>
          ))}
          {/* Finish: the line with the chequered flag above it. */}
          <line x1={sx} y1={sy - 34} x2={sx} y2={sy + 34} className="lap-finish" />
          <svg x={sx - 22} y={sy - 86} width="44" height="44" viewBox="0 0 24 24" className="lap-flag">
            <IconPaths name="flag" />
          </svg>
          {slowest ? (
            <g className="lap-note">
              <circle cx={slowest.point[0]} cy={slowest.point[1]} r={9} className="lap-note-dot" />
              <text
                x={slowest.point[0] + (inner(slowest.point[0]) ? -26 : 26)}
                y={slowest.point[1] + 9}
                textAnchor={inner(slowest.point[0]) ? "end" : "start"}
              >
                <tspan className="lap-note-value">{slowest.speed} km/h</tspan>
                <tspan className="lap-note-text"> {labels.slowest}</tspan>
              </text>
            </g>
          ) : null}
          {TRAIL.map((delay, i) => (
            <rect
              key={delay}
              className={`lap-trail lap-trail-${i + 1}`}
              x={-13 + i * 2}
              y={-13 + i * 2}
              width={26 - i * 4}
              height={26 - i * 4}
            >
              {motion(`${delay}s`)}
            </rect>
          ))}
          <rect className="lap-car" x={-17} y={-17} width={34} height={34}>
            {motion()}
          </rect>
          <rect className="lap-car-static" x={sx - 17} y={sy - 17} width={34} height={34} />
        </svg>

        {/* A speedometer in sync with the square: the bar fills with each stretch's speed. */}
        {synced ? (
          <div className="lap-speed" aria-hidden="true">
            <span className="lap-speed-label">{labels.speed}</span>
            <svg className="lap-speed-bar" width="100%" height="10" focusable="false">
              <rect className="lap-speed-track" x="0" y="0" width="100%" height="10" />
              <rect className="lap-speed-fill" x="0" y="0" width="0%" height="10">
                <animate
                  attributeName="width"
                  dur={dur}
                  repeatCount="indefinite"
                  calcMode="linear"
                  keyTimes={keyTimesAttr}
                  values={[...speeds, speeds[0]!].map((v) => `${((v / hi) * 100).toFixed(1)}%`).join(";")}
                />
              </rect>
            </svg>
            <span className="lap-speed-range">
              {lo}–{hi} km/h
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
