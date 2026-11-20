import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { Lang, StandingsHistory } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Marker, SERIES_COUNT, seriesClass } from "./series";
import { CHART_SIZES, CHART_W, sizeClass, type ChartSize } from "./sizes";

/**
 * Points accumulated round by round (NUC-33), in the brand's chart style (brand.md §5):
 * a 1 px horizontal grid, only the zero line, direct labels at the end of each series, the protagonist at
 * 3 px and a single note in the accent colour. Rendered on the server: it needs no JS.
 * Always accompanied by a table with the same data (TRA-22).
 * Drawn in two geometries (D-37): on the narrow one the end labels use the driver's code.
 */

const H: Record<ChartSize, number> = { wide: 380, narrow: 320 };
const M: Record<ChartSize, { top: number; right: number; bottom: number; left: number }> = {
  wide: { top: 24, right: 132, bottom: 36, left: 44 },
  narrow: { top: 24, right: 78, bottom: 36, left: 40 },
};
const LABEL_GAP = 15;

type Series = StandingsHistory["drivers"][number];

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
  /** Favourite driver IDs (COM-10): a heavier stroke and a star on the label, and "favourite" in the description. */
  favorites?: Set<string>;
}) {
  const series = selected
    .map((id) => history.drivers.find((d) => d.driver.id === id))
    .filter((d): d is Series => Boolean(d))
    .slice(0, SERIES_COUNT);
  if (series.length === 0 || history.rounds.length === 0) return null;

  return (
    <figure className="chart chart-duo">
      {CHART_SIZES.map((size) => (
        <PointsPlot key={size} lang={lang} history={history} series={series} title={title} favorites={favorites} size={size} />
      ))}
      <figcaption className="source">{title}</figcaption>
    </figure>
  );
}

function PointsPlot({
  lang,
  history,
  series,
  title,
  favorites,
  size,
}: {
  lang: Lang;
  history: StandingsHistory;
  series: Series[];
  title: string;
  favorites: Set<string>;
  size: ChartSize;
}) {
  const t = dict(lang);
  const W = CHART_W[size];
  const H_ = H[size];
  const m = M[size];
  const n = history.rounds.length;
  const maxPoints = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p ?? 0)));
  const x = scaleLinear()
    .domain([0, Math.max(1, n - 1)])
    .range([m.left, W - m.right]);
  const y = scaleLinear().domain([0, maxPoints]).nice(4).range([H_ - m.bottom, m.top]);
  const ticks = y.ticks(4);
  const path = line<number | null>()
    .defined((p) => p !== null)
    .x((_, i) => x(i))
    .y((p) => y(p ?? 0));

  // Direct labels at the end of each series, spaced so they do not overlap.
  const labels = series
    .map((s, i) => ({
      i,
      name: `${favorites.has(s.driver.id) ? "★ " : ""}${size === "narrow" ? (s.driver.code ?? s.driver.familyName) : s.driver.familyName}`,
      value: lastValue(s.points),
      y: y(lastValue(s.points)),
    }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < labels.length; k++) {
    labels[k]!.y = Math.max(labels[k]!.y, labels[k - 1]!.y + LABEL_GAP);
  }

  // Note: the leader's margin over second place at the end, anchored with a dot (brand.md §5).
  const [first, second] = [...series].sort((a, b) => lastValue(b.points) - lastValue(a.points));
  const lead = first && second ? lastValue(first.points) - lastValue(second.points) : 0;
  const markerEvery = Math.max(1, Math.ceil(n / (size === "wide" ? 8 : 5)));
  const titleId = `chart-title-${history.season}-${size}`;
  const descId = `chart-desc-${history.season}-${size}`;

  return (
    <svg viewBox={`0 0 ${W} ${H_}`} role="img" aria-labelledby={`${titleId} ${descId}`} className={sizeClass(size)}>
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
          <line x1={m.left} x2={W - m.right} y1={y(tick)} y2={y(tick)} />
          <text x={m.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart-axis">
            {size === "wide" && tick === ticks.at(-1) ? `${formatPoints(lang, tick)} pts` : formatPoints(lang, tick)}
          </text>
        </g>
      ))}
      {/* The unit once (brand.md §5): on the narrow geometry, over the axis, since beside the value it does not fit. */}
      {size === "narrow" ? (
        <text x={m.left - 8} y={m.top - 12} textAnchor="end" className="chart-axis">
          pts
        </text>
      ) : null}

      {/* A round label too close to the last one ("Round 20", end-aligned) is left out so they do not overlap. */}
      {history.rounds.map((r, i) =>
        (i % markerEvery === 0 && x(n - 1) - x(i) > 66) || i === n - 1 ? (
          <text key={r.round} x={x(i)} y={H_ - m.bottom + 20} textAnchor={i === n - 1 ? "end" : "middle"} className="chart-axis">
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
            p !== null && (k % markerEvery === 0 || k === n - 1) ? <Marker key={k} index={i} cx={x(k)} cy={y(p)} /> : null,
          )}
        </g>
      ))}

      {labels.map((l) => (
        <text key={l.i} x={W - m.right + (size === "wide" ? 10 : 6)} y={l.y} dy="0.32em" className="chart-label">
          {l.name} · {formatPoints(lang, l.value)}
        </text>
      ))}

      {first && lead > 0 ? (
        <g className="chart-note">
          <circle cx={x(n - 1)} cy={y(lastValue(first.points))} r={4.5} />
          <text x={x(n - 1) - 10} y={y(lastValue(first.points)) - 14} textAnchor="end">
            {
              {
                es: `${formatPoints(lang, lead)} puntos de ventaja`,
                en: `${formatPoints(lang, lead)}-point lead`,
                de: `${formatPoints(lang, lead)} Punkte Vorsprung`,
              }[lang]
            }
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function lastValue(points: (number | null)[]): number {
  for (let i = points.length - 1; i >= 0; i--) if (points[i] !== null) return points[i]!;
  return 0;
}
