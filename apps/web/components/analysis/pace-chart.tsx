import { scaleLinear } from "d3-scale";
import type { PaceData } from "@paddock/analysis";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { Marker, seriesClass } from "../charts/series";
import { localeOf } from "@/lib/format";
import { CHART_SIZES, CHART_W, sizeClass, type ChartSize } from "../charts/sizes";

/**
 * Race pace (TEC-03): lap times for up to four drivers and the trend of each stint.
 * Excluded laps (pits, start, neutralised) are hidden unless asked for.
 */
const H: Record<ChartSize, number> = { wide: 360, narrow: 300 };
const M: Record<ChartSize, { top: number; right: number; bottom: number; left: number }> = {
  wide: { top: 20, right: 120, bottom: 30, left: 56 },
  narrow: { top: 20, right: 44, bottom: 30, left: 50 },
};

export function PaceChart({
  lang,
  data,
  selected,
  showAll,
}: {
  lang: Lang;
  data: PaceData;
  selected: number[];
  showAll: boolean;
}) {
  const series = selected.map((n) => data.drivers.find((d) => d.number === n)).filter((d) => d !== undefined);
  const points = series.flatMap((s) => s.laps.filter((l) => showAll || l.excluded === null));
  if (points.length === 0) return null;
  const times = points.map((p) => p.time).sort((a, b) => a - b);
  // A robust scale: from the minimum to the 98th percentile, so one slow lap does not flatten the rest.
  const lo = times[0]!;
  const hi = times[Math.floor(times.length * 0.98)] ?? times.at(-1)!;
  return (
    <figure className="chart chart-duo">
      {CHART_SIZES.map((size) => (
        <PacePlot key={size} lang={lang} data={data} series={series} showAll={showAll} lo={lo} hi={hi} size={size} />
      ))}
    </figure>
  );
}

function PacePlot({
  lang,
  data,
  series,
  showAll,
  lo,
  hi,
  size,
}: {
  lang: Lang;
  data: PaceData;
  series: PaceData["drivers"];
  showAll: boolean;
  lo: number;
  hi: number;
  size: ChartSize;
}) {
  const t = dict(lang).analysis;
  const W = CHART_W[size];
  const H_ = H[size];
  const m = M[size];
  const x = scaleLinear().domain([1, data.laps]).range([m.left, W - m.right]);
  const y = scaleLinear().domain([lo - 0.3, hi + 0.3]).nice(5).range([H_ - m.bottom, m.top]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
  const clipId = `pace-clip-${size}-${series.map((s) => s.number).join("-")}`;
  const xTicks = x.ticks(size === "wide" ? 8 : 4);

  return (
    <svg viewBox={`0 0 ${W} ${H_}`} role="img" aria-label={t.tools.pace.name} className={sizeClass(size)}>
      {/* Nothing is drawn outside the chart area, even if a data point is wrong. */}
      <defs>
        <clipPath id={clipId}>
          <rect x={m.left} y={m.top} width={W - m.left - m.right} height={H_ - m.top - m.bottom} />
        </clipPath>
      </defs>
      {data.neutralised.map((p, i) => (
        <rect key={i} className={`neutralised-band neutralised-${p.kind}`} x={x(p.fromLap)} width={Math.max(2, x(p.toLap) - x(p.fromLap))} y={m.top} height={H_ - m.top - m.bottom} />
      ))}
      {y.ticks(5).map((tick) => (
        <g key={tick} className="chart-grid">
          <line x1={m.left} x2={W - m.right} y1={y(tick)} y2={y(tick)} />
          <text x={m.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart-axis">
            {fmt(tick)}
          </text>
        </g>
      ))}
      {xTicks.map((tick, i, all) => (
        <text key={tick} x={x(tick)} y={H_ - 8} textAnchor={i === all.length - 1 ? "end" : "middle"} className="chart-axis">
          {i === all.length - 1 ? `${t.lap} ${tick}` : tick}
        </text>
      ))}
      {series.map((s, i) => (
        <g key={s.number} className={seriesClass(i)}>
          {s.laps
            .filter((l) => (showAll || l.excluded === null) && l.time <= hi + 0.3)
            .map((l) => (
              <Marker key={l.lap} index={i} cx={x(l.lap)} cy={y(l.time)} />
            ))}
          {s.stints.map((st) =>
            st.trend ? (
              <line
                key={st.stint}
                className="series-line"
                clipPath={`url(#${clipId})`}
                x1={x(st.trend[0])}
                y1={y(st.trend[1])}
                x2={x(st.trend[2])}
                y2={y(st.trend[3])}
              />
            ) : null,
          )}
          <text x={W - m.right + (size === "wide" ? 10 : 6)} y={m.top + 16 + i * 18} className="chart-label">
            {s.code}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PaceTable({ lang, data, selected }: { lang: Lang; data: PaceData; selected: number[] }) {
  const t = dict(lang).analysis;
  const fmt = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.tableAlt}>
      <table>
        <thead>
          <tr>
            <th scope="col">{t.drivers}</th>
            <th scope="col" className="num">{t.stint}</th>
            <th scope="col" className="num">{t.lap}</th>
            <th scope="col" className="num">{t.mean}</th>
            <th scope="col" className="num">
              {t.slope} ({t.perLap})
            </th>
          </tr>
        </thead>
        <tbody>
          {data.drivers
            .filter((d) => selected.includes(d.number))
            .flatMap((d) =>
              d.stints.map((s) => (
                <tr key={`${d.number}-${s.stint}`}>
                  <th scope="row">{d.name}</th>
                  <td className="num">{s.stint}</td>
                  <td className="num">
                    {s.fromLap}–{s.toLap}
                  </td>
                  <td className="num">{s.mean === null ? "—" : fmt.format(s.mean)}</td>
                  <td className="num">{s.slope === null ? "—" : `${s.slope > 0 ? "+" : s.slope < 0 ? "−" : ""}${fmt.format(Math.abs(s.slope))}`}</td>
                </tr>
              )),
            )}
        </tbody>
      </table>
    </div>
  );
}
