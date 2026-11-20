/**
 * The circuit layout (NUC-43): generated from OpenF1's coordinates for a real lap (D-09), never copied from
 * an official map. The accent dot marks the finish line.
 */
export function CircuitMap({
  points,
  label,
  caption,
  corners = [],
}: {
  points: [number, number][];
  label: string;
  caption: string;
  /** Numbered braking zones (NUC-44); the page's table repeats the same in text. */
  corners?: { n: number; point: [number, number] }[];
}) {
  if (points.length < 10) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 30;
  const [minX, minY] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
  const [w, h] = [Math.max(...xs) - minX + pad, Math.max(...ys) - minY + pad];
  const d = `M${points.map((p) => p.join(",")).join(" L")} Z`;
  const [sx, sy] = points[0]!;
  return (
    <figure className="chart circuit-map">
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} role="img" aria-label={label} className="chart-svg">
        <path d={d} className="circuit-path" />
        <g className="chart-note">
          <circle cx={sx} cy={sy} r={12} />
        </g>
        {corners.map((c) => (
          <g key={c.n} className="corner-mark">
            <circle cx={c.point[0]} cy={c.point[1]} r={20} />
            <text x={c.point[0]} y={c.point[1]} dy="0.35em" textAnchor="middle">
              {c.n}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="source">{caption}</figcaption>
    </figure>
  );
}
