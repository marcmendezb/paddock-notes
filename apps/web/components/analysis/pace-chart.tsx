import { scaleLinear } from "d3-scale";
import type { PaceData } from "@paddock/analysis";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { Marker, seriesClass } from "../charts/series";

/**
 * Ritmo de carrera (TEC-03): tiempo por vuelta de hasta cuatro pilotos y tendencia de cada stint.
 * Las vueltas excluidas (boxes, salida, neutralizadas) se ocultan salvo que se pidan.
 */
const W = 760;
const H = 360;
const M = { top: 20, right: 120, bottom: 30, left: 56 };

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
  const t = dict(lang).analysis;
  const series = selected.map((n) => data.drivers.find((d) => d.number === n)).filter((d) => d !== undefined);
  const points = series.flatMap((s) => s.laps.filter((l) => showAll || l.excluded === null));
  if (points.length === 0) return null;
  const times = points.map((p) => p.time).sort((a, b) => a - b);
  // Escala robusta: del mínimo al percentil 98, para que una vuelta lenta no aplaste el resto.
  const lo = times[0]!;
  const hi = times[Math.floor(times.length * 0.98)] ?? times.at(-1)!;
  const x = scaleLinear().domain([1, data.laps]).range([M.left, W - M.right]);
  const y = scaleLinear().domain([lo - 0.3, hi + 0.3]).nice(5).range([H - M.bottom, M.top]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.tools.pace.name} className="chart-svg">
        {data.neutralised.map((p, i) => (
          <rect key={i} className={`neutralised-band neutralised-${p.kind}`} x={x(p.fromLap)} width={Math.max(2, x(p.toLap) - x(p.fromLap))} y={M.top} height={H - M.top - M.bottom} />
        ))}
        {y.ticks(5).map((tick) => (
          <g key={tick} className="chart-grid">
            <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text x={M.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="chart-axis">
              {fmt(tick)}
            </text>
          </g>
        ))}
        {x.ticks(8).map((tick, i, all) => (
          <text key={tick} x={x(tick)} y={H - 8} textAnchor="middle" className="chart-axis">
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
              st.mean !== null && st.slope !== null ? (
                <line
                  key={st.stint}
                  className="series-line"
                  x1={x(st.fromLap)}
                  x2={x(st.toLap)}
                  y1={y(st.mean - (st.slope * (st.toLap - st.fromLap)) / 2)}
                  y2={y(st.mean + (st.slope * (st.toLap - st.fromLap)) / 2)}
                />
              ) : null,
            )}
            <text x={W - M.right + 10} y={M.top + 16 + i * 18} className="chart-label">
              {s.code}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function PaceTable({ lang, data, selected }: { lang: Lang; data: PaceData; selected: number[] }) {
  const t = dict(lang).analysis;
  const fmt = new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
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
