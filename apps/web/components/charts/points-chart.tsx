import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { Lang, StandingsHistory } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Marker, SERIES_COUNT, seriesClass } from "./series";

/**
 * Puntos acumulados ronda a ronda (NUC-33), según el estilo de gráficos de la marca (marca.md §5):
 * rejilla horizontal de 1 px, solo la línea de cero, etiquetas directas al final de cada serie,
 * protagonista a 3 px y una única nota en color de acento. Se renderiza en el servidor: no necesita JS.
 * Siempre va acompañado de una tabla con los mismos datos (TRA-22).
 */

const W = 760;
const H = 380;
const M = { top: 24, right: 132, bottom: 36, left: 44 };
const LABEL_GAP = 15;

export function PointsChart({
  lang,
  history,
  selected,
  title,
  favorites = new Set<string>(),
}: {
  lang: Lang;
  history: StandingsHistory;
  selected: string[];
  title: string;
  /** ID de pilotos favoritos (COM-10): trazo más grueso y estrella en la etiqueta, y «favorito» en la descripción. */
  favorites?: Set<string>;
}) {
  const t = dict(lang);
  const series = selected
    .map((id) => history.drivers.find((d) => d.driver.id === id))
    .filter((d): d is StandingsHistory["drivers"][number] => Boolean(d))
    .slice(0, SERIES_COUNT);
  if (series.length === 0 || history.rounds.length === 0) return null;

  const n = history.rounds.length;
  const maxPoints = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p ?? 0)));
  const x = scaleLinear()
    .domain([0, Math.max(1, n - 1)])
    .range([M.left, W - M.right]);
  const y = scaleLinear().domain([0, maxPoints]).nice(4).range([H - M.bottom, M.top]);
  const ticks = y.ticks(4);
  const path = line<number | null>()
    .defined((p) => p !== null)
    .x((_, i) => x(i))
    .y((p) => y(p ?? 0));

  // Etiquetas directas al final de cada serie, separadas para que no se pisen.
  const labels = series
    .map((s, i) => ({
      i,
      name: `${favorites.has(s.driver.id) ? "★ " : ""}${s.driver.familyName}`,
      value: lastValue(s.points),
      y: y(lastValue(s.points)),
    }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < labels.length; k++) {
    labels[k]!.y = Math.max(labels[k]!.y, labels[k - 1]!.y + LABEL_GAP);
  }

  // Nota: la ventaja del líder sobre el segundo al final, anclada con un punto (marca.md §5).
  const [first, second] = [...series].sort((a, b) => lastValue(b.points) - lastValue(a.points));
  const lead = first && second ? lastValue(first.points) - lastValue(second.points) : 0;
  const markerEvery = Math.max(1, Math.ceil(n / 8));
  const titleId = `chart-title-${history.season}`;
  const descId = `chart-desc-${history.season}`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`} className="chart-svg">
        <title id={titleId}>{title}</title>
        <desc id={descId}>
          {series
            .map(
              (s) =>
                `${s.driver.familyName}${favorites.has(s.driver.id) ? ` (${t.favorite.toLowerCase()})` : ""}: ${formatPoints(lang, lastValue(s.points))}`,
            )
            .join(", ")}
        </desc>

        {ticks.map((tick) => (
          <g key={tick} className={tick === 0 ? "chart-baseline" : "chart-grid"}>
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text x={M.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart-axis">
              {tick === ticks.at(-1) ? `${formatPoints(lang, tick)} pts` : formatPoints(lang, tick)}
            </text>
          </g>
        ))}

        {history.rounds.map((r, i) =>
          i % markerEvery === 0 || i === n - 1 ? (
            <text key={r.round} x={x(i)} y={H - M.bottom + 20} textAnchor="middle" className="chart-axis">
              {i === n - 1 ? `${t.standings2.round} ${r.round}` : r.round}
            </text>
          ) : null,
        )}

        {series.map((s, i) => (
          <g
            key={s.driver.id}
            className={`${seriesClass(i)}${s === first ? " series-lead" : ""}${favorites.has(s.driver.id) ? " series-favorite" : ""}`}
          >
            <path d={path(s.points) ?? undefined} className="series-line" />
            {s.points.map((p, k) =>
              p !== null && (k % markerEvery === 0 || k === n - 1) ? (
                <Marker key={k} index={i} cx={x(k)} cy={y(p)} />
              ) : null,
            )}
          </g>
        ))}

        {labels.map((l) => (
          <text key={l.i} x={W - M.right + 10} y={l.y} dy="0.32em" className="chart-label">
            {l.name} · {formatPoints(lang, l.value)}
          </text>
        ))}

        {first && lead > 0 ? (
          <g className="chart-note">
            <circle cx={x(n - 1)} cy={y(lastValue(first.points))} r={4.5} />
            <text x={x(n - 1) - 10} y={y(lastValue(first.points)) - 14} textAnchor="end">
              {lang === "es" ? `${formatPoints(lang, lead)} puntos de ventaja` : `${formatPoints(lang, lead)}-point lead`}
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="source">{title}</figcaption>
    </figure>
  );
}

function lastValue(points: (number | null)[]): number {
  for (let i = points.length - 1; i >= 0; i--) if (points[i] !== null) return points[i]!;
  return 0;
}
