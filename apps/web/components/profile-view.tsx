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
