import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type { MDXContent } from "mdx/types";
import { Icon, type IconName } from "./icons";

/**
 * Cuerpo de un explicador (CON-01) compuesto como un artículo de revista. El MDX se parte por sus títulos de
 * segundo nivel: lo que va antes es la entradilla; cada sección lleva su número; la de «Cómo verlo en
 * nuestros gráficos» va en un bloque negro y la de «Términos relacionados», como fichas. Las secciones se
 * reconocen por su título en los tres idiomas; si no encajan, se pintan como una sección normal.
 */

type Props = { children?: ReactNode };
type Section = { title: string; id: string; nodes: ReactElement<Props>[]; kind: "plain" | "charts" | "terms" };

const el = (node: ReactNode): node is ReactElement<Props> => isValidElement<Props>(node);
const kids = (node: ReactElement<Props>) => Children.toArray(node.props.children);
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (el(node)) return text(node.props.children);
  return "";
}

const CHARTS = /gráfico|chart|grafik/i;
const TERMS = /términos|terms|begriffe/i;

export function explainerSections(Body: MDXContent): { lead: ReactElement<Props>[]; sections: Section[] } | null {
  const root = (Body as unknown as (props: object) => ReactNode)({});
  if (!el(root)) return null;
  const lead: ReactElement<Props>[] = [];
  const sections: Section[] = [];
  for (const node of kids(root)) {
    if (!el(node)) continue;
    if (node.type === "h2") {
      const title = text(node).replace(/^\d+\.\s*/, "");
      const kind = TERMS.test(title) ? "terms" : CHARTS.test(title) ? "charts" : "plain";
      sections.push({ title, id: `s${sections.length + 1}`, nodes: [], kind });
    } else if (sections.length) sections.at(-1)!.nodes.push(node);
    else lead.push(node);
  }
  return sections.length ? { lead, sections } : null;
}

/** Pictograma de cada capítulo de la guía de iniciación, en orden. */
const CHAPTER_ICONS: IconName[] = ["calendar", "user", "trophy", "layers", "wrench", "flag", "stopwatch", "chart"];

export function ExplainerBody({ lead, sections, chapters = false }: { lead: ReactElement<Props>[]; sections: Section[]; chapters?: boolean }) {
  let n = 0;
  if (chapters) {
    // La guía (CON-03): capítulos con el número gigante fijo a la izquierda y su pictograma.
    return (
      <div className="xp xp-guide">
        <span className="xp-progress" aria-hidden="true" />
        {lead.length ? <div className="xp-lead">{lead}</div> : null}
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="xp-chapter" aria-labelledby={`${s.id}-t`}>
            <div className="xp-chapter-side" aria-hidden="true">
              <span className="xp-chapter-n tabular">{String(i + 1).padStart(2, "0")}</span>
              <span className="xp-chapter-icon">
                <Icon name={CHAPTER_ICONS[i] ?? "book"} />
              </span>
            </div>
            <div className="xp-chapter-body">
              <h2 id={`${s.id}-t`} className="xp-chapter-title">
                {s.title}
              </h2>
              <div className="article xp-text">{s.nodes}</div>
            </div>
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="xp">
      {lead.length ? <div className="xp-lead">{lead}</div> : null}
      {sections.map((s) => {
        if (s.kind === "terms") {
          const links = s.nodes.flatMap((p) => kids(p).filter(el));
          return (
            <section key={s.id} id={s.id} className="xp-terms" aria-labelledby={`${s.id}-t`}>
              <h2 id={`${s.id}-t`} className="xp-terms-title">
                {s.title}
              </h2>
              <ul className="gl-chips">
                {links.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          );
        }
        n += 1;
        return (
          <section key={s.id} id={s.id} className={s.kind === "charts" ? "xp-sec xp-charts" : "xp-sec"} data-surface={s.kind === "charts" ? "ink" : undefined} aria-labelledby={`${s.id}-t`}>
            <h2 id={`${s.id}-t`} className="xp-h2">
              <span className="xp-n tabular" aria-hidden="true">
                {s.kind === "charts" ? <Icon name="chart" /> : String(n).padStart(2, "0")}
              </span>
              <span>{s.title}</span>
            </h2>
            <div className="article xp-text">{s.nodes}</div>
          </section>
        );
      })}
    </div>
  );
}

/** Índice de las secciones, fijo al lado del texto. */
export function ExplainerToc({ sections, label }: { sections: Section[]; label: string }) {
  let n = 0;
  return (
    <nav className="xp-toc" aria-label={label}>
      <ol>
        {sections.map((s) => {
          if (s.kind === "terms") return null;
          if (s.kind !== "charts") n += 1;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`}>
                <span className="xp-toc-n tabular" aria-hidden="true">
                  {s.kind === "charts" ? "↗" : String(n).padStart(2, "0")}
                </span>
                {s.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
