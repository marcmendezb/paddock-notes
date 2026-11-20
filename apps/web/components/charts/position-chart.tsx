import { scaleBand, scaleLinear } from "d3-scale";
import type { Lang } from "@paddock/shared";

/**
 * Final championship position per season (NUC-41): one point per season, 1st at the top.
 * The note marks the titles. It comes with the profile's table of seasons (TRA-22).
 */
const W = 720;
const H = 220;
const M = { top: 20, right: 16, bottom: 30, left: 36 };

export function PositionChart({
  lang,
  seasons,
  title,
}: {
  lang: Lang;
  seasons: { season: number; position: number | null }[];
  title: string;
}) {
  const points = seasons.filter((s): s is { season: number; position: number } => s.position !== null);
  if (points.length < 2) return null;
  const worst = Math.max(10, ...points.map((p) => p.position));
  const x = scaleBand<number>()
    .domain(seasons.map((s) => s.season))
    .range([M.left, W - M.right])
    .padding(0.3);
  const y = scaleLinear().domain([1, worst]).range([M.top, H - M.bottom]);
  const ticks = [1, ...[5, 10, 15, 20, 25].filter((t) => t <= worst)];
  const labelEvery = Math.max(1, Math.ceil(seasons.length / 12));
  const centre = (season: number) => (x(season) ?? 0) + x.bandwidth() / 2;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="chart-svg">
        {ticks.map((tick) => (
          <g key={tick} className={tick === 1 ? "chart-baseline" : "chart-grid"}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text x={M.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart-axis">
              {tick === 1 ? { es: "1.º", en: "1st", de: "1." }[lang] : tick}
            </text>
          </g>
        ))}
        {seasons.map((s, i) =>
          i % labelEvery === 0 || i === seasons.length - 1 ? (
            <text key={s.season} x={centre(s.season)} y={H - 8} textAnchor="middle" className="chart-axis">
              {s.season}
            </text>
          ) : null,
        )}
        <g className="series series-1">
          {points.map((p) =>
            p.position === 1 ? (
              <g key={p.season} className="chart-note">
                <circle cx={centre(p.season)} cy={y(1)} r={6} />
              </g>
            ) : (
              <circle key={p.season} cx={centre(p.season)} cy={y(p.position)} r={4} className="series-marker" />
            ),
          )}
        </g>
      </svg>
      <figcaption className="source">{title}</figcaption>
    </figure>
  );
}
