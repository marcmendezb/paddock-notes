/**
 * Trazado del circuito (NUC-43): generado con las coordenadas de OpenF1 de una vuelta real (D-09),
 * nunca copiado de un plano oficial. El punto de acento marca la línea de meta.
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
  /** Frenadas numeradas (NUC-44); la tabla de la página repite lo mismo en texto. */
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
