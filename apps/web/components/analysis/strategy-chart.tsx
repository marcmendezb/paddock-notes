import { scaleLinear } from "d3-scale";
import type { Compound, StrategyData } from "@paddock/analysis";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/**
 * Estrategia de neumáticos (TEC-02): una fila por piloto y un tramo por stint. El compuesto se distingue
 * por trama y letra, no solo por color, y no copia los colores oficiales de los neumáticos.
 */
const ROW = 22;
const M = { top: 40, right: 12, bottom: 28, left: 52 };
const W = 760;

export const COMPOUND_LETTER: Record<Compound, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
  INTERMEDIATE: "I",
  WET: "W",
  UNKNOWN: "?",
};

export function CompoundPatterns() {
  return (
    <defs>
      <pattern id="pat-inter" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" className="compound-inter-bg" />
        <line x1="0" y1="0" x2="0" y2="6" className="compound-hatch" />
      </pattern>
      <pattern id="pat-wet" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" className="compound-inter-bg" />
        <circle cx="3" cy="3" r="1.3" className="compound-dot" />
      </pattern>
    </defs>
  );
}

export function StrategyChart({ lang, data }: { lang: Lang; data: StrategyData }) {
  const t = dict(lang).analysis;
  const H = M.top + data.drivers.length * ROW + M.bottom;
  const x = scaleLinear().domain([0, data.laps]).range([M.left, W - M.right]);
  const ticks = x.ticks(8).filter((v) => v > 0);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.tools.strategy.name} className="chart-svg">
        <CompoundPatterns />
        {data.neutralised.map((p, i) => (
          <g key={i} className={`neutralised neutralised-${p.kind}`}>
            <rect x={x(p.fromLap - 1)} width={x(p.toLap) - x(p.fromLap - 1)} y={M.top - 6} height={H - M.top - M.bottom + 6} />
            {/* Si dos periodos van seguidos (un SC que acaba en bandera roja), la etiqueta sube una línea. */}
            <text
              x={x(p.fromLap - 1) + 3}
              y={M.top - 10 - (i > 0 && x(p.fromLap - 1) - x(data.neutralised[i - 1]!.fromLap - 1) < 40 ? 12 : 0)}
              className="chart-axis"
            >
              {p.kind}
            </text>
          </g>
        ))}
        {ticks.map((tick) => (
          <text key={tick} x={x(tick)} y={H - 8} textAnchor="middle" className="chart-axis">
            {tick === ticks.at(-1) ? `${t.lap} ${tick}` : tick}
          </text>
        ))}
        {data.drivers.map((d, i) => {
          const y = M.top + i * ROW;
          return (
            <g key={d.number}>
              <text x={M.left - 8} y={y + ROW / 2} dy="0.32em" textAnchor="end" className="chart-label">
                {d.code}
              </text>
              {d.stints.map((s, k) => {
                const x0 = x(s.fromLap - 1);
                const w = Math.max(1, x(s.toLap) - x0 - 1);
                return (
                  <g key={k} className={`compound compound-${s.compound}`}>
                    <rect x={x0} y={y + 3} width={w} height={ROW - 6} rx={2} />
                    {w > 14 ? (
                      <text x={x0 + w / 2} y={y + ROW / 2} dy="0.32em" textAnchor="middle" className="compound-letter">
                        {COMPOUND_LETTER[s.compound]}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        {(["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"] as const).map((c) => (
          <span key={c} className="legend-item">
            <svg width="22" height="14" aria-hidden="true">
              <CompoundPatterns />
              <g className={`compound compound-${c}`}>
                <rect width="22" height="14" rx="2" />
                <text x="11" y="7" dy="0.32em" textAnchor="middle" className="compound-letter">
                  {COMPOUND_LETTER[c]}
                </text>
              </g>
            </svg>
            {t.compounds[c]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * `official`: clasificación oficial por código de piloto (Jolpica). La posición de OpenF1 es la de pista al
 * cruzar la meta; las sanciones posteriores solo están en la oficial.
 */
export function StrategyTable({ lang, data, official }: { lang: Lang; data: StrategyData; official?: Map<string, string> }) {
  const t = dict(lang).analysis;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.tableAlt}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.onTrack}</th>
            {official ? <th scope="col" className="num">{t.official}</th> : null}
            <th scope="col">{t.drivers}</th>
            <th scope="col">{t.stint}</th>
          </tr>
        </thead>
        <tbody>
          {data.drivers.map((d) => (
            <tr key={d.number}>
              <td className="num">{d.finish ?? "—"}</td>
              {official ? <td className="num">{official.get(d.code) ?? "—"}</td> : null}
              <th scope="row">{d.name}</th>
              <td>
                {d.stints
                  .map((s) => `${t.compounds[s.compound]} (${t.lap.toLowerCase()} ${s.fromLap}–${s.toLap})`)
                  .join(" → ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pilotos cuya posición en pista no coincide con la oficial (sanciones posteriores), para avisarlo en texto. */
export function officialDifferences(data: StrategyData, official: Map<string, string>): string[] {
  return data.drivers
    .filter((d) => d.finish !== null && official.has(d.code) && /^\d+$/.test(official.get(d.code)!) && Number(official.get(d.code)) !== d.finish)
    .map((d) => d.code);
}
