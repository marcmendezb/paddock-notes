import type { ReactNode } from "react";
import type { Lang } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon, type IconName } from "./icons";
import { HeroStats } from "./page-hero";

/**
 * Fichas de piloto y de equipo (NUC-40, NUC-41): cabecera negra con el nombre en grande, el dorsal (o las
 * iniciales del equipo) enorme en contorno detrás, los títulos como insignias y las cifras clave al lado.
 */
export function ProfileHero({
  icon,
  crumbs,
  kicker,
  given,
  family,
  mark,
  titles,
  titleLabel,
  lede,
  stats,
}: {
  icon: IconName;
  crumbs: ReactNode;
  kicker: ReactNode;
  given?: string;
  family: string;
  /** Dorsal o iniciales, en gigante detrás (decorativo). */
  mark: string | null;
  titles: number[];
  titleLabel: string;
  lede: ReactNode;
  stats: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }[];
}) {
  return (
    <section className="pf-hero" data-surface="ink" aria-labelledby="profile-title">
      {mark ? (
        <span className="pf-mark" aria-hidden="true">
          {mark}
        </span>
      ) : null}
      <div className="container pf-grid">
        <div className="ph-crumbs">{crumbs}</div>
        <div className="pf-head">
          <p className="eyebrow ph-kicker">
            <Icon name={icon} /> {kicker}
          </p>
          <h1 id="profile-title" className="pf-name">
            {given ? <span className="pf-given">{given}</span> : null}
            <span className="pf-family">{family}</span>
          </h1>
          {titles.length ? (
            <p className="pf-titles">
              <span className="pf-titles-label">
                <Icon name="trophy" /> {titleLabel}
              </span>
              {titles.map((y) => (
                <span key={y} className="pf-title-year tabular">
                  {y}
                </span>
              ))}
            </p>
          ) : null}
          {lede ? <p className="pf-lede">{lede}</p> : null}
        </div>
        <div className="pf-stats">
          <HeroStats items={stats} />
        </div>
      </div>
    </section>
  );
}

/** Frente al compañero de equipo: una barra partida, lo que va por delante en lima. */
export function TeammateBar({ lang, ahead, races }: { lang: Lang; ahead: number; races: number }) {
  const t = dict(lang).driver;
  const share = races ? (ahead / races) * 100 : 0;
  return (
    <section className="pf-mate" data-surface="ink" aria-labelledby="teammate">
      <h2 id="teammate" className="pf-mate-title">
        <Icon name="user" /> {t.teammateTitle}
      </h2>
      <p className="pf-mate-line">{t.teammates(ahead, races)}</p>
      <div className="pf-mate-bar" aria-hidden="true">
        <svg width="100%" height="14" focusable="false">
          <rect x="0" y="0" width="100%" height="14" className="pf-mate-rail" />
          <rect x="0" y="0" width={`${share.toFixed(2)}%`} height="14" className="pf-mate-fill" />
        </svg>
        <span className="pf-mate-legend">
          <span>
            {t.ahead} <strong className="tabular">{ahead}</strong>
          </span>
          <span>
            {t.behind} <strong className="tabular">{races - ahead}</strong>
          </span>
        </span>
      </div>
    </section>
  );
}

/** Puntos de una temporada con barra proporcional a la mejor de la carrera del piloto o equipo. */
export function SeasonPoints({ lang, points, top }: { lang: Lang; points: number | null; top: number }) {
  if (points === null) return <>—</>;
  return (
    <span className="st-points-inner">
      <span className="st-points-n tabular">{formatPoints(lang, points)}</span>
      <svg className="timing-bar" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="100%" height="100%" className="timing-bar-rail" />
        <rect x="0" y="0" width={`${((points / Math.max(1, top)) * 100).toFixed(2)}%`} height="100%" className="timing-bar-fill" />
      </svg>
    </span>
  );
}

export function PositionBadge({ position }: { position: number | null }) {
  if (!position) return <>—</>;
  return <span className={position === 1 ? "pf-pos is-1" : position <= 3 ? "pf-pos is-podium" : "pf-pos"}>P{position}</span>;
}

/** Qué temporadas cuentan las cifras de la ficha: el histórico se carga de la más reciente hacia atrás. */
export function DataNote({ lang, from, to }: { lang: Lang; from: number; to: number }) {
  return (
    <p className="pf-data-note">
      <Icon name="calendar" />
      <span>{dict(lang).driver.dataNote(from, to)}</span>
    </p>
  );
}

/** Victorias, podios y puntos por carrera como anillos: el porcentaje, en texto dentro de cada uno. */
export function RateRings({ items }: { items: { label: string; value: number; text: string; accent?: boolean }[] }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  return (
    <ul className="pf-rings">
      {items.map((it) => (
        <li key={it.label} className={it.accent ? "is-accent" : undefined}>
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle cx="50" cy="50" r={R} className="pf-ring-rail" />
            <circle
              cx="50"
              cy="50"
              r={R}
              className="pf-ring-fill"
              strokeDasharray={`${(Math.max(0, Math.min(1, it.value)) * C).toFixed(1)} ${C.toFixed(1)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="pf-ring-text tabular">{it.text}</span>
          <span className="pf-ring-label">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Año a año: una columna por temporada con su equipo (o pilotos), la posición final y una barra de puntos. */
export function SeasonRibbon({
  lang,
  title,
  seasons,
  winsLabel,
}: {
  lang: Lang;
  title: string;
  winsLabel: string;
  seasons: { season: number; who: string; position: number | null; wins: number; points: number | null }[];
}) {
  const top = Math.max(1, ...seasons.map((s) => s.points ?? 0));
  return (
    <div className="pf-ribbon-wrap" tabIndex={0} role="region" aria-label={title}>
    <ol className="pf-ribbon">
      {seasons.map((s) => (
        <li key={s.season} className={s.position === 1 ? "is-champion" : undefined}>
          <span className="pf-ribbon-year tabular">{s.season}</span>
          <span className="pf-ribbon-pos tabular">{s.position ? `P${s.position}` : "—"}</span>
          <svg className="pf-ribbon-bar" aria-hidden="true" focusable="false">
            <rect x="0" y="0" width="100%" height="100%" className="pf-ribbon-rail" />
            <rect x="0" y="0" width={`${(((s.points ?? 0) / top) * 100).toFixed(2)}%`} height="100%" className="pf-ribbon-fill" />
          </svg>
          <span className="pf-ribbon-pts tabular">{s.points === null ? "—" : `${formatPoints(lang, s.points)} pts`}</span>
          <span className="pf-ribbon-who">{s.who}</span>
          {s.wins ? (
            <span className="pf-ribbon-wins tabular">
              {s.wins} {winsLabel}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
    </div>
  );
}
