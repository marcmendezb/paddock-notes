import type { ReactNode } from "react";
import { Icon, IconPaths, type IconName } from "./icons";

/**
 * Header for section pages (learn, analysis, records, profiles…): the same black band as the race and
 * circuit pages, attached to the navigation bar. A kicker with its pictogram, a large title, a lede and, on
 * the right, a slot for figures or actions. Behind it, the section's pictogram, giant and in a faint
 * stroke, turning slowly as you scroll (decoration only).
 */
export function PageHero({
  icon,
  kicker,
  title,
  lede,
  crumbs,
  aside,
  children,
  size = "l",
  labelledBy = "page-title",
}: {
  icon: IconName;
  kicker: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: ReactNode;
  /** Right column: figures, a card, a form. */
  aside?: ReactNode;
  /** Below the title, full width (filters, indexes). */
  children?: ReactNode;
  size?: "m" | "l";
  labelledBy?: string;
}) {
  return (
    <section className={`ph ph-${size}${aside ? " has-aside" : ""}`} data-surface="ink" aria-labelledby={labelledBy}>
      <svg className="ph-motif" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <IconPaths name={icon} />
      </svg>
      <div className="container ph-grid">
        {crumbs ? <div className="ph-crumbs">{crumbs}</div> : null}
        <div className="ph-head">
          <p className="eyebrow ph-kicker">
            <Icon name={icon} /> {kicker}
          </p>
          <h1 id={labelledBy} className="ph-title">
            {title}
          </h1>
          {lede ? <div className="ph-lede">{lede}</div> : null}
        </div>
        {aside ? <div className="ph-aside">{aside}</div> : null}
        {children ? <div className="ph-extra">{children}</div> : null}
      </div>
    </section>
  );
}

/** Large figures for the header's right-hand slot. */
export function HeroStats({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }[] }) {
  return (
    <dl className="ph-stats">
      {items.map((s) => (
        <div key={s.label} className={s.accent ? "is-accent" : undefined}>
          <dt>{s.label}</dt>
          <dd>
            <span className="ph-stat-value tabular">{s.value}</span>
            {s.sub ? <span className="ph-stat-sub">{s.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
