/**
 * Trazado del circuito (NUC-43): generado con las coordenadas de OpenF1 de una vuelta real (D-09),
 * nunca copiado de un plano oficial. El punto de acento marca la línea de meta.
 */
export function CircuitMap({ points, label, caption }: { points: [number, number][]; label: string; caption: string }) {
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
      </svg>
      <figcaption className="source">{caption}</figcaption>
    </figure>
  );
}
