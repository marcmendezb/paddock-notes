import Link from "next/link";
import { gpName, noteFor, type Lang, type RaceDetail, type RaceResultRow } from "@paddock/shared";
import { formatDate, formatPoints, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon, type IconName } from "./icons";
import { smoothClosedPath } from "./race-recap";

/**
 * «Así acabó…» (NUC-05): la crónica de la última carrera en la portada. Es siempre la misma plantilla y
 * se rellena solo con el resultado, que está desde el primer momento (también el provisional, D-31): no
 * espera al análisis técnico. Un titular escrito con los datos, el podio escalonado, seis claves, el
 * gráfico de salida a meta de toda la parrilla y los puntos del 4.º al 10.º.
 */

const FINISHED = /^(Finished|Lapped|\+\d+ Laps?)$/;
const LAPPED = /^(Lapped|\+\d+ Laps?)$/;

/** «+14.602» → 14.602; «+1:02.345» → 62.345. Vueltas o estados → null. */
function gapSeconds(time: string | null): number | null {
  if (!time || !time.startsWith("+")) return null;
  const parts = time.slice(1).split(":").map(Number);
  return parts.some((n) => Number.isNaN(n)) ? null : parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** El circuito de la carrera, enorme y tenue detrás de todo, con un círculo lila que lo recorre sin parar. */
function Backdrop({ points }: { points: [number, number][] }) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  const d = smoothClosedPath(points);
  return (
    <svg className="recap-track" viewBox={`${minX} ${minY} ${w} ${h}`} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <path d={d} className="recap-track-base" />
      <path d={d} pathLength={1} className="recap-track-line" />
      <circle r={Math.max(w, h) / 110} className="recap-car">
        <animateMotion dur="26s" repeatCount="indefinite" path={d} />
      </circle>
    </svg>
  );
}

/**
 * Salida → meta de toda la parrilla: una línea por piloto de su puesto de salida al de llegada. El ganador
 * en lima, la mayor remontada en lila, el resto del podio en blanco y los demás en gris; los abandonos,
 * discontinuos, al final. Cada línea lleva su título (posición de salida y de llegada) al señalarla.
 */
function SlopeChart({ lang, rows, winnerId, climberId, label }: { lang: Lang; rows: RaceResultRow[]; winnerId: string | null; climberId: string | null; label: string }) {
  const r = dict(lang).home.recap.report;
  const n = rows.length;
  const maxGrid = Math.max(n, ...rows.map((x) => x.grid ?? 0));
  const slots = maxGrid + 1;
  const W = 600;
  const top = 34;
  const row = 22;
  const H = top + slots * row;
  const x0 = 92;
  const x1 = W - 92;
  const y = (slot: number) => top + (slot - 0.5) * row;
  return (
    <svg className="slope" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <text x={x0} y={14} textAnchor="middle" className="slope-axis">
        {r.start}
      </text>
      <text x={x1} y={14} textAnchor="middle" className="slope-axis">
        {r.finish}
      </text>
      <line x1={x0} x2={x0} y1={top - 8} y2={H - 4} className="slope-rail" />
      <line x1={x1} x2={x1} y1={top - 8} y2={H - 4} className="slope-rail" />
      {rows.map((d, i) => {
        const start = d.grid === 0 || d.grid === null ? slots : d.grid;
        const end = i + 1;
        const out = !FINISHED.test(d.status) && d.position === null;
        const cls =
          d.driver.id === winnerId ? "is-win" : d.driver.id === climberId ? "is-climb" : i < 3 ? "is-podium" : out ? "is-out" : "";
        const code = d.driver.code ?? d.driver.familyName.slice(0, 3).toUpperCase();
        return (
          <g key={d.driver.id} className={`slope-line ${cls}`}>
            <title>{`${fullName(d.driver)}: ${d.grid === 0 ? "PL" : (d.grid ?? "—")} → ${d.position ?? d.positionText}`}</title>
            <line x1={x0} y1={y(start)} x2={x1} y2={y(end)} />
            <circle cx={x0} cy={y(start)} r={3.5} />
            <circle cx={x1} cy={y(end)} r={3.5} />
            <text x={x0 - 12} y={y(start)} dy="0.35em" textAnchor="end" className="slope-label">
              <tspan className="slope-num">{d.grid === 0 ? "PL" : (d.grid ?? "—")}</tspan> {code}
            </text>
            <text x={x1 + 12} y={y(end)} dy="0.35em" className="slope-label">
              {code} <tspan className="slope-num">{d.position ?? d.positionText}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RaceReport({ lang, race, hasAnalysis, circuit }: { lang: Lang; race: RaceDetail; hasAnalysis: boolean; circuit: [number, number][] | null }) {
  const t = dict(lang);
  const rc = t.home.recap;
  const r = rc.report;
  const nf = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  const rows = race.results;
  const [p1, p2, p3] = rows;
  if (!p1) return null;
  const gp = gpName(lang, race.name);
  const raceHref = `/${lang}/races/${race.season}/${race.round}`;
  const note = noteFor(race.season, race.round);

  // Las claves, calculadas con el resultado.
  const margin = gapSeconds(p2?.time ?? null);
  const climber = [...rows].filter((x) => (x.positionsGained ?? 0) > 0).sort((a, b) => b.positionsGained! - a.positionsGained!)[0] ?? null;
  const fastest = rows.find((x) => x.fastestLap?.rank === 1) ?? null;
  const pole = rows.find((x) => x.grid === 1) ?? null;
  const out = rows.filter((x) => !FINISHED.test(x.status) && x.status !== "Did not start");
  const finishers = rows.filter((x) => FINISHED.test(x.status));
  const lapped = rows.filter((x) => LAPPED.test(x.status));
  const fromGrid = (g: number | null) => (g === 0 ? "PL" : g ? `${g}.º` : "—");
  const bigClimb = climber && climber.driver.id !== p1.driver.id && (climber.positionsGained ?? 0) >= 6 ? climber : null;

  const headline = r.headline({
    winner: p1.driver.familyName,
    grid: p1.grid,
    second: p2?.driver.familyName ?? null,
    margin: margin !== null ? nf.format(margin) : null,
    climber: bigClimb ? { name: bigClimb.driver.familyName, n: bigClimb.positionsGained!, to: bigClimb.position ?? 0 } : null,
  });

  type Key = { icon: IconName; label: string; value: string; sub: string };
  const keys = ([
    margin !== null && p2 ? { icon: "stopwatch" as const, label: r.margin, value: `${nf.format(margin)} s`, sub: r.over(p2.driver.familyName) } : null,
    climber
      ? { icon: "gauge" as const, label: rc.climb, value: `+${climber.positionsGained}`, sub: r.climbSub(climber.driver.familyName, fromGrid(climber.grid), climber.position ?? 0) }
      : null,
    fastest?.fastestLap?.time
      ? { icon: "bolt" as const, label: rc.fastest, value: fastest.fastestLap.time, sub: r.fastestSub(fastest.driver.familyName, fastest.fastestLap.lap) }
      : null,
    pole ? { icon: "flag" as const, label: r.pole, value: pole.position ? `P${pole.position}` : r.out, sub: r.poleSub(pole.driver.familyName) } : null,
    {
      icon: "wrench" as const,
      label: r.dnf,
      value: String(out.length),
      sub: out.length ? out.map((x) => x.driver.code ?? x.driver.familyName).join(" · ") : r.dnfNone,
    },
    { icon: "layers" as const, label: r.lapped, value: String(lapped.length), sub: r.lappedSub(finishers.length) },
  ] as (Key | null)[]).filter((k): k is Key => k !== null);

  const podium = [p2, p1, p3].filter((x): x is RaceResultRow => Boolean(x));
  const points = rows.slice(3, 10).filter((x) => x.points > 0);

  return (
    <section className="recap rr" aria-labelledby="last-race">
      <div className="recap-finish" aria-hidden="true" />
      {circuit && circuit.length > 2 ? <Backdrop points={circuit} /> : null}
      <div className="container rr-grid">
        <header className="rr-head">
          <p className="eyebrow recap-eyebrow icon-scroll">
            <Icon name="flag" /> {rc.kicker} · {t.home.round(race.round, race.season)} · {formatDate(lang, race.date)}
            {race.provisional ? <span className="rr-prov">{r.provisional}</span> : null}
          </p>
          <h2 id="last-race" className="recap-title">
            {t.home.last(gp)}
          </h2>
          <p className="rr-headline">{headline}</p>
        </header>

        <ol className="rr-podium">
          {podium.map((p) => {
            const pos = p === p1 ? 1 : p === p2 ? 2 : 3;
            return (
              <li key={p.driver.id} className={`rr-step rr-step-${pos}`} value={pos}>
                <div className="rr-who">
                  <Link href={`/${lang}/drivers/${p.driver.id}`} className="rr-name">
                    <span className="rr-given">{p.driver.givenName}</span> {p.driver.familyName}
                  </Link>
                  <span className="rr-team">{p.constructor.name}</span>
                </div>
                <div className="rr-block" data-surface={pos === 1 ? "ink" : undefined}>
                  <span className="rr-pos tabular" aria-hidden="true">
                    {pos}
                  </span>
                  <span className="rr-time tabular">{p.time ?? p.status}</span>
                  {p.grid !== null ? <span className="rr-grid-from">{p.grid === 0 ? rc.pitLane : rc.started(p.grid)}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>

        <dl className="rr-keys">
          {keys.map((k) => (
            <div key={k.label}>
              <dt>
                <Icon name={k.icon} /> {k.label}
              </dt>
              <dd>
                <span className="rr-key-value tabular">{k.value}</span>
                <span className="rr-key-sub">{k.sub}</span>
              </dd>
            </div>
          ))}
        </dl>

        <figure className="rr-slope" data-surface="ink">
          <figcaption className="rr-card-title">
            <Icon name="chart" /> {r.slope}
          </figcaption>
          <SlopeChart lang={lang} rows={rows} winnerId={p1.driver.id} climberId={climber?.driver.id ?? null} label={r.slopeLabel(gp, fullName(p1.driver))} />
        </figure>

        <div className="rr-side">
          {points.length ? (
            <div className="rr-points">
              <h3 className="rr-card-title">
                <Icon name="trophy" /> {r.points}
              </h3>
              <ol>
                {points.map((p) => (
                  <li key={p.driver.id} value={p.position ?? undefined}>
                    <span className="rr-points-pos tabular">{p.position}</span>
                    <Link href={`/${lang}/drivers/${p.driver.id}`}>{fullName(p.driver)}</Link>
                    <span className="rr-points-team">{p.constructor.name}</span>
                    <span className="rr-points-n tabular">{r.pts(formatPoints(lang, p.points), p.points === 1)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="recap-actions rr-actions" data-surface="ink">
            {note ? (
              <Link href={`/${lang}/notes/${note.slug}`} className="recap-note">
                <span className="recap-note-kicker">
                  <Icon name="book" /> {rc.note}
                </span>
                <span className="recap-note-title">{note.title[lang]}</span>
                <span className="recap-note-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ) : null}
            <ul className="recap-links">
              <li>
                <Link href={raceHref}>
                  <Icon name="flag" /> {t.home.seeRace}
                </Link>
              </li>
              {hasAnalysis ? (
                <li>
                  <Link href={`/${lang}/analysis/${race.season}/${race.round}`}>
                    <Icon name="gauge" /> {t.analysis.open}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
