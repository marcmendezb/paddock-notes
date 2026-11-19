import type { ReactNode } from "react";
import { Icon, IconPaths, type IconName } from "./icons";

/**
 * Cabecera de las páginas de sección (aprende, análisis, récords, fichas…): la misma banda negra que las de
 * carrera, circuito e histórico, pegada a la barra de navegación. Antetítulo con su pictograma, título
 * grande, entradilla y, a la derecha, un hueco para datos o acciones. Detrás, el pictograma de la sección
 * en gigante y en trazo tenue, que gira despacio al bajar (solo decoración).
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
  /** Columna derecha: cifras, una tarjeta, un formulario. */
  aside?: ReactNode;
  /** Debajo del título, a todo el ancho (filtros, índices). */
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

/** Cifras grandes para el hueco derecho de la cabecera. */
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
