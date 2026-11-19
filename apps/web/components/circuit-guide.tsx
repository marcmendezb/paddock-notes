import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import type { MDXContent } from "mdx/types";
import { Icon, type IconName } from "./icons";

/**
 * «La previa» de la ficha de circuito (CON-05) como una doble página de revista. El MDX sigue la plantilla
 * de contenido.md §5.4: cinco títulos de segundo nivel, siempre en el mismo orden (la frase, las curvas
 * clave, el coche, la estrategia y el momento histórico). Se lee el árbol que devuelve el MDX, se parte por
 * esos títulos y cada parte se compone a su manera:
 *
 * 1. La frase, como una cita enorme; lo demás, al margen.
 * 2. Las curvas clave, en negro, en el orden de la vuelta: número, curva oficial (lo que va entre
 *    paréntesis en el texto), nombre y explicación.
 * 3 y 4. El coche y la estrategia, enfrentados, con su pictograma.
 * 5. El momento histórico, con el año en grande.
 *
 * Si una guía no sigue la plantilla, se pinta tal cual, como un artículo. Todo en el servidor.
 */

type Props = { children?: ReactNode };
type Section = { title: string; nodes: ReactElement<Props>[] };

const el = (node: ReactNode): node is ReactElement<Props> => isValidElement<Props>(node);
const kids = (node: ReactElement<Props>) => Children.toArray(node.props.children);

function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (el(node)) return text(node.props.children);
  return "";
}

/** «La S de Senna (curvas 1 y 2).» → nombre y curva oficial; sin paréntesis, solo el nombre. */
function cornerTitle(raw: string): { name: string; turn: string | null } {
  const m = raw.trim().match(/^(.*?)\s*\(([^)]+)\)\.?$/);
  if (m) return { name: m[1]!, turn: m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1) };
  return { name: raw.trim().replace(/\.$/, ""), turn: null };
}

function sections(Body: MDXContent): Section[] | null {
  // Un MDX sin envoltorio devuelve un fragmento con los bloques de primer nivel como hijos.
  const root = (Body as unknown as (props: object) => ReactNode)({});
  if (!el(root)) return null;
  const out: Section[] = [];
  for (const node of kids(root)) {
    if (!el(node)) continue;
    if (node.type === "h2") out.push({ title: text(node), nodes: [] });
    else out.at(-1)?.nodes.push(node);
  }
  return out.length === 5 ? out : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Kicker({ n, title, icon }: { n: number; title: string; icon?: IconName }) {
  return (
    <h3 className="pv-kicker">
      <span className="pv-num tabular" aria-hidden="true">
        {pad(n)}
      </span>
      {icon ? <Icon name={icon} /> : null}
      <span>{title}</span>
    </h3>
  );
}

export function GuideSpread({ Body, updated }: { Body: MDXContent; updated: string }) {
  const parts = sections(Body);
  if (!parts) {
    return (
      <div className="cv-guide">
        <div className="article">
          <Body />
        </div>
        <p className="source">{updated}</p>
      </div>
    );
  }
  const [lead, corners, car, strategy, moment] = parts as [Section, Section, Section, Section, Section];

  const [quote, ...aside] = lead.nodes;
  const items = corners.nodes
    .filter((n) => n.type === "ul" || n.type === "ol")
    .flatMap((list) => kids(list).filter(el))
    .map((li) => {
      const [first, ...rest] = kids(li);
      const strong = el(first) && first.type === "strong";
      return { ...cornerTitle(strong ? text(first) : ""), body: strong ? rest : kids(li) };
    });
  const cornerIntro = corners.nodes.filter((n) => n.type === "p");

  // «2008, última carrera del año…» → el año aparte y el resto con mayúscula. «2021. Max…» empieza como
  // una lista numerada en Markdown (<ol start="2021">): el año es su inicio y el texto, su elemento.
  const [story, ...storyRest] = moment.nodes;
  let year: string | null = null;
  let storyKids: ReactNode[] = story ? kids(story) : [];
  if (story && story.type === "ol") {
    const start = (story.props as { start?: number }).start;
    const item = kids(story).find(el);
    if (start && start > 1900 && item) {
      year = String(start);
      storyKids = kids(item);
    }
  }
  const head = storyKids[0];
  if (typeof head === "string") {
    const m = head.match(/^(\d{4})[.,]\s*/);
    if (m) {
      year = m[1]!;
      const rest = head.slice(m[0].length);
      storyKids = [rest.charAt(0).toUpperCase() + rest.slice(1), ...storyKids.slice(1)];
    }
  }

  return (
    <div className="pv">
      <div className="pv-lead">
        <Kicker n={1} title={lead.title} />
        {quote ? <blockquote className="pv-quote">{quote.props.children}</blockquote> : null}
        {aside.length ? <div className="pv-aside">{aside}</div> : null}
      </div>

      <div className="pv-corners" data-surface="ink">
        <Kicker n={2} title={corners.title} icon="flag" />
        {cornerIntro.length ? <div className="pv-corners-intro">{cornerIntro}</div> : null}
        <ol className="pv-corner-list">
          {items.map((c, i) => (
            <li key={c.name}>
              <span className="pv-corner-n tabular" aria-hidden="true">
                {pad(i + 1)}
              </span>
              {c.turn ? <span className="pv-corner-turn">{c.turn}</span> : null}
              <strong className="pv-corner-name">{c.name}</strong>
              <p className="pv-corner-text">{c.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="pv-pair">
        {[
          { s: car, n: 3, icon: "wrench" as const },
          { s: strategy, n: 4, icon: "layers" as const },
        ].map(({ s, n, icon }) => (
          <div key={n} className="pv-col">
            <Kicker n={n} title={s.title} icon={icon} />
            <div className="pv-col-body">{s.nodes}</div>
          </div>
        ))}
      </div>

      <div className="pv-moment" data-surface="ink">
        <Kicker n={5} title={moment.title} />
        {year ? (
          <p className="pv-year tabular" aria-hidden="true">
            {year}
          </p>
        ) : null}
        <div className="pv-story">
          {story ? (
            <p>
              {year ? <span className="visually-hidden">{year}. </span> : null}
              {storyKids}
            </p>
          ) : null}
          {storyRest}
        </div>
      </div>

      <p className="source pv-updated">{updated}</p>
    </div>
  );
}
