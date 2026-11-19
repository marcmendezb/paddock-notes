import type { ReactNode } from "react";
import type { ConstructorStandingRow, DriverStandingRow, Lang, StandingsHistory } from "@paddock/shared";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon } from "./icons";
import { DriverLink, TeamLink } from "./links";

/**
 * Página de clasificación (NUC-30 a NUC-35): el hero con el líder y la temporada como barra de progreso, las
 * dos clasificaciones como pantallas de cronometraje con barras de puntos y la posición en cada GP como mapa
 * de calor. Todo son tablas o texto: las barras y los colores acompañan al dato, nunca lo sustituyen (TRA-22).
 * Barras en porcentaje como atributos SVG (D-04).
 */

const pct = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;

export function StandingsHero({
  lang,
  season,
  round,
  total,
  leader,
  second,
  isFinal,
  status,
  pickers,
}: {
  lang: Lang;
  season: number;
  round: number;
  total: number;
  leader: DriverStandingRow | null;
  second: DriverStandingRow | null;
  /** Temporada terminada: el líder es el campeón. */
  isFinal: boolean;
  /** Frase de estado del título (quién puede ganarlo, puntos en juego…). */
  status: ReactNode;
  pickers: ReactNode;
}) {
  const t = dict(lang);
  const s = t.standings2;
  const lead = leader && second ? leader.points - second.points : null;
  return (
    <section className="st-hero" data-surface="ink" aria-labelledby="standings-title">
      <div className="container st-hero-grid">
        <div className="st-hero-head">
          <p className="eyebrow rv-kicker">
            <Icon name="trophy" /> {s.kicker(season)}
          </p>
          <h1 id="standings-title" className="st-title">
            {t.standings.title(season)}
          </h1>
          {status}
        </div>
        <div className="st-pickers">{pickers}</div>
        {leader ? (
          <div className="st-leader">
            <p className="st-leader-kicker">{isFinal ? s.champion : s.leader}</p>
            <p className="st-leader-name">
              <span className="st-leader-given">{leader.driver.givenName}</span>
              <span className="st-leader-family">{leader.driver.familyName}</span>
            </p>
            <p className="st-leader-team">{leader.constructors.map((c) => c.name).join(" / ")}</p>
            <p className="st-leader-points">
              <span className="tabular">{formatPoints(lang, leader.points)}</span>
              <span className="st-leader-unit">pts</span>
            </p>
            {lead !== null && second ? <p className="st-leader-lead">{s.leadOver(formatPoints(lang, lead), fullName(second.driver))}</p> : null}
          </div>
        ) : null}
        {total > 0 ? (
          <div className="st-progress">
            <p className="st-progress-label">
              <span>{s.progress(round, total)}</span>
            </p>
            <ol className="st-rounds" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <li key={i} className={i < round ? "is-done" : i === round ? "is-next" : undefined} />
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Clasificación de pilotos como pantalla de cronometraje: puntos con barra proporcional al líder. */
export function DriverTower({ lang, rows, favorites }: { lang: Lang; rows: DriverStandingRow[]; favorites: Set<string> }) {
  const t = dict(lang);
  const c = t.standings.columns;
  const top = Math.max(1, rows[0]?.points ?? 1);
  return (
    <div className="timing st-tower" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={t.standings.drivers}>
        <table className="timing-table">
          <thead>
            <tr>
              <th scope="col" className="num">{c.pos}</th>
              <th scope="col">{c.driver}</th>
              <th scope="col" className="st-points-col">{c.points}</th>
              <th scope="col" className="num">{c.gap}</th>
              <th scope="col" className="num">{t.standings2.winsShort}</th>
              <th scope="col" className="num">{t.standings2.podiumsShort}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const fav = favorites.has(`d:${r.driver.id}`) || r.constructors.some((k) => favorites.has(`c:${k.id}`));
              return (
                <tr key={r.driver.id} className={`${i < 3 ? `is-p${i + 1}` : ""}${fav ? " is-favorite" : ""}`}>
                  <td className="num timing-pos">{r.position ?? "—"}</td>
                  <th scope="row" className="timing-driver">
                    <span className="timing-who">
                      <DriverLink lang={lang} driver={r.driver} />
                      {/* El equipo en texto: dos enlaces pequeños por fila no cumplen el tamaño mínimo (WCAG 2.5.8). */}
                      <span className="timing-team">{r.constructors.map((k) => k.name).join(" / ")}</span>
                      {fav ? <span className="tag tag-fav">{t.favorite}</span> : null}
                    </span>
                  </th>
                  <td className="st-points">
                    <PointsBar points={r.points} top={top} first={i === 0} lang={lang} />
                  </td>
                  <td className="num st-gap tabular">{r.gapToLeader === 0 ? "—" : `−${formatPoints(lang, r.gapToLeader)}`}</td>
                  <td className="num tabular">{r.wins || "·"}</td>
                  <td className="num tabular">{r.podiums || "·"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConstructorTower({ lang, rows, favorites }: { lang: Lang; rows: ConstructorStandingRow[]; favorites: Set<string> }) {
  const t = dict(lang);
  const c = t.standings.columns;
  const top = Math.max(1, rows[0]?.points ?? 1);
  return (
    <div className="timing st-tower" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={t.standings.constructors}>
        <table className="timing-table">
          <thead>
            <tr>
              <th scope="col" className="num">{c.pos}</th>
              <th scope="col">{c.team}</th>
              <th scope="col" className="st-points-col">{c.points}</th>
              <th scope="col" className="num">{t.standings2.winsShort}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const fav = favorites.has(`c:${r.constructor.id}`);
              return (
                <tr key={r.constructor.id} className={`${i < 3 ? `is-p${i + 1}` : ""}${fav ? " is-favorite" : ""}`}>
                  <td className="num timing-pos">{r.position ?? "—"}</td>
                  <th scope="row" className="timing-driver">
                    <span className="timing-who">
                      <TeamLink lang={lang} team={r.constructor} />
                      {fav ? <span className="tag tag-fav">{t.favorite}</span> : null}
                    </span>
                  </th>
                  <td className="st-points">
                    <PointsBar points={r.points} top={top} first={i === 0} lang={lang} />
                  </td>
                  <td className="num tabular">{r.wins || "·"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PointsBar({ lang, points, top, first }: { lang: Lang; points: number; top: number; first: boolean }) {
  return (
    <span className="st-points-inner">
      <span className="st-points-n tabular">{formatPoints(lang, points)}</span>
      <svg className="timing-bar" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="100%" height="100%" className="timing-bar-rail" />
        <rect x="0" y="0" width={pct((points / top) * 100)} height="100%" className={first ? "timing-bar-win" : "timing-bar-fill"} />
      </svg>
    </span>
  );
}

/** Posición de cada piloto en cada GP (NUC-34) como mapa de calor: el número va siempre en la celda. */
export function ResultsHeatmap({ lang, history }: { lang: Lang; history: StandingsHistory }) {
  const t = dict(lang);
  const h = t.standings2.heat;
  const kind = (r: string | null) => {
    if (r === null) return "is-none";
    if (r === "1") return "is-win";
    if (r === "2" || r === "3") return "is-podium";
    const n = Number(r);
    if (Number.isInteger(n)) return n <= 10 ? "is-points" : "is-out";
    return "is-dnf";
  };
  return (
    <div className="heat-card" data-surface="ink">
      <ul className="heat-legend">
        {(["win", "podium", "points", "out", "dnf"] as const).map((k) => (
          <li key={k}>
            <span className={`heat-swatch is-${k}`} aria-hidden="true" />
            {h[k]}
          </li>
        ))}
      </ul>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={t.standings2.matrix}>
        <table className="heat">
          <thead>
            <tr>
              <th scope="col">{t.standings.columns.driver}</th>
              {history.rounds.map((r) => (
                <th key={r.round} scope="col" title={r.name} className="num">
                  {r.round}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.drivers.map((d) => (
              <tr key={d.driver.id}>
                <th scope="row">{fullName(d.driver)}</th>
                {d.results.map((r, i) => (
                  <td key={i} className={kind(r)}>
                    {r ?? "·"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
