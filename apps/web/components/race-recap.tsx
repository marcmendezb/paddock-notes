import type { ReplayData, StrategyData } from "@paddock/analysis";
import type { Lang, RaceDetail } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { Marker, SeriesSwatch, seriesClass } from "./charts/series";
import { Icon } from "./icons";

/**
 * Gráfico de posiciones vuelta a vuelta de una carrera (página de carrera): los tres del podio destacados,
 * el resto del pelotón detrás, las neutralizaciones como franjas y una nota en el momento clave. La crónica
 * de la portada está en race-report.tsx.
 */

const W = 760;
const H = 300;
const M = { top: 34, right: 64, bottom: 44, left: 30 };
/** El gráfico enfoca la pelea de delante: de la P1 a la P10. Lo que cae más atrás se recorta. */
const DEPTH = 10;

export function PositionsChart({ lang, race, replay, strategy }: { lang: Lang; race: RaceDetail; replay: ReplayData; strategy: StrategyData | null }) {
  const t = dict(lang).home.recap;
  const podium = race.results.slice(0, 3).map((r) => r.driver.code);
  const top = podium.map((code) => replay.drivers.find((d) => d.code === code)).filter((d) => d !== undefined);
  if (top.length === 0) return null;
  const x = (lap: number) => M.left + ((lap - 1) / Math.max(1, replay.laps - 1)) * (W - M.left - M.right);
  const y = (pos: number) => M.top + ((pos - 1) / (DEPTH - 1)) * (H - M.top - M.bottom);
  const path = (positions: (number | null)[]) => {
    let d = "";
    let pen = false;
    positions.forEach((p, i) => {
      if (p === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i + 1).toFixed(1)},${y(p).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  // El momento clave: desde qué vuelta lideró el ganador sin perder ya la primera posición.
  const winner = top[0]!;
  let leadFrom: number | null = null;
  for (let i = winner.positions.length - 1; i >= 0; i--) {
    if (winner.positions[i] === 1) leadFrom = i + 1;
    else break;
  }
  const every = Math.max(1, Math.ceil(replay.laps / 7));

  return (
    <figure className="chart recap-chart">
      <figcaption className="recap-card-head">
        <span className="recap-card-title">
          <Icon name="chart" /> {t.story}
        </span>
        <ul className="recap-legend" aria-hidden="true">
          {top.map((d, i) => (
            <li key={d.code}>
              <SeriesSwatch index={i} /> {d.code}
            </li>
          ))}
          <li className="recap-legend-field">{t.field}</li>
        </ul>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="recap-chart-title" className="chart-svg">
        <title id="recap-chart-title">{t.chartTitle}</title>
        <defs>
          <clipPath id="recap-clip">
            <rect x={M.left - 6} y={M.top - 10} width={W - M.left - M.right + 12} height={H - M.top - M.bottom + 20} />
          </clipPath>
        </defs>
        {(strategy?.neutralised ?? []).map((p, i, all) => {
          // Dos franjas seguidas (coche de seguridad y bandera roja): la segunda etiqueta baja una línea.
          const crowded = i > 0 && x(p.fromLap) - x(all[i - 1]!.fromLap) < 36;
          return (
            <g key={i} className={`neutralised neutralised-${p.kind}`}>
              <rect x={x(p.fromLap) - 3} y={M.top - 10} width={Math.max(6, x(p.toLap) - x(p.fromLap) + 6)} height={H - M.top - M.bottom + 20} />
              <text x={x(p.fromLap)} y={H - M.bottom + 22 + (crowded ? 12 : 0)} textAnchor="middle" className="recap-band-label">
                {p.kind === "RED" ? t.red : p.kind}
              </text>
            </g>
          );
        })}
        {[1, 3, 5, 10].map((p) => (
          <text key={p} x={M.left - 10} y={y(p)} dy="0.32em" textAnchor="end" className="chart-axis">
            {p === 1 ? "P1" : p}
          </text>
        ))}
        {/* El resto del pelotón, detrás y sin color. */}
        <g clipPath="url(#recap-clip)">
          {replay.drivers
            .filter((d) => !podium.includes(d.code))
            .map((d) => (
              <path key={d.code} d={path(d.positions)} className="recap-field" />
            ))}
        </g>
        {[...top].reverse().map((d) => {
          const i = top.indexOf(d);
          const last = d.positions.reduce<number>((acc, p, k) => (p !== null ? k : acc), 0);
          return (
            <g key={d.code} className={`${seriesClass(i)} recap-series`}>
              <path d={path(d.positions)} className="series-line recap-line" pathLength={1} clipPath="url(#recap-clip)" />
              {d.positions.map((p, k) =>
                p !== null && p <= DEPTH && (k % every === 0 || k === last) ? <Marker key={k} index={i} cx={x(k + 1)} cy={y(p)} /> : null,
              )}
              <text x={x(last + 1) + 10} y={y(d.positions[last] ?? 1)} dy="0.32em" className="chart-label">
                {d.code} · P{i + 1}
              </text>
            </g>
          );
        })}
        <rect x={M.left - 6} y={M.top - 24} width={W - M.left + 6} height={H - M.top - M.bottom + 34} className="recap-wipe" />
        {leadFrom && leadFrom > 1 ? (
          <g className="chart-note">
            <circle cx={x(leadFrom)} cy={y(1)} r={4.5} />
            <text x={x(leadFrom)} y={y(1) - 14} textAnchor={leadFrom > replay.laps * 0.6 ? "end" : "start"}>
              {t.leadFrom(winner.code, leadFrom)}
            </text>
          </g>
        ) : null}
        {[1, ...Array.from({ length: 6 }, (_, k) => (k + 1) * every + 1), replay.laps]
          .filter((l, k, a) => l <= replay.laps && a.indexOf(l) === k)
          .map((l) => (
            <text key={l} x={x(l)} y={H - M.bottom + 8} dy="0.9em" textAnchor="middle" className="chart-axis recap-lap-axis">
              {l === replay.laps ? `${t.lap} ${l}` : l}
            </text>
          ))}
      </svg>
      <p className="source">{t.chartCaption}</p>
    </figure>
  );
}

/**
 * Trazado cerrado y suave: los puntos de telemetría unidos con curvas (Catmull-Rom pasado a Bézier) en vez
 * de rectas, para que no queden picos. Se queda uno de cada dos puntos, que basta para la forma.
 */
export function smoothClosedPath(raw: [number, number][]): string {
  const pts = raw.filter((_, i) => i % 2 === 0);
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n]!;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(at(0)[0])},${f(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0]!)},${f(c1[1]!)} ${f(c2[0]!)},${f(c2[1]!)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
}
