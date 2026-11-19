import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXPLAINERS, NOTES } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { figureComponents } from "@/components/figures";
import { JsonLd } from "@/components/json-ld";
import { noteBody } from "@/content/notes";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { SITE_URL } from "@/lib/site";
import { articleLd } from "@/lib/structured-data";
import { TOOL_ICON, TOOL_ORDER } from "@/lib/tools";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";

type Props = { params: Promise<{ lang: string; slug: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const note = NOTES.find((n) => n.slug === p.slug);
  const Body = note ? noteBody(lang, note.slug) : null;
  if (!note || !Body) notFound();
  return { lang, note, Body };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, note } = await load(params);
  return {
    title: note.title[lang],
    description: note.description[lang],
    alternates: {
      canonical: `/${lang}/notes/${note.slug}`,
      languages: { es: `/es/notes/${note.slug}`, en: `/en/notes/${note.slug}`, de: `/de/notes/${note.slug}` },
    },
  };
}

/** Nota post-carrera (CON-04, contenido.md §5.1): texto en MDX con los gráficos reales de la carrera. */
export default async function NotePage({ params }: Props) {
  const { lang, note, Body } = await load(params);
  const t = dict(lang);
  const explainer = EXPLAINERS.find((e) => e.slug === note.explainer);
  const analysis = `/${lang}/analysis/${note.season}/${note.round}`;
  return (
    <article>
      <JsonLd
        data={articleLd(
          {
            slug: note.slug,
            headline: note.title[lang],
            description: note.description[lang],
            datePublished: note.date,
            dateModified: note.date,
            section: "notes",
          },
          { lang, site: SITE_URL },
        )}
      />
      <PageHero
        icon="flag"
        size="m"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/notes`, label: t.notes.title }, { label: note.title[lang] }]} />}
        kicker={
          <>
            {t.notes.title} · <span className="tabular">{formatDate(lang, note.date)}</span>
          </>
        }
        title={note.title[lang]}
        lede={<p>{note.description[lang]}</p>}
      />
      <div className="container reading">
        <div className="article lede-first reading-main">
          <Body components={figureComponents(lang)} />
          <p className="source">
            {t.notes.published(formatDate(lang, note.date))} {t.notes.sources}
          </p>
        </div>
        <aside className="reading-aside" aria-labelledby="explore">
          <h2 id="explore" className="reading-aside-title">
            {t.notes.tools}
          </h2>
          <ul className="reading-links">
            <li>
              <Link href={`/${lang}/races/${note.season}/${note.round}`}>
                <Icon name="flag" /> {t.notes.race}
              </Link>
            </li>
            {TOOL_ORDER.map((tool) => (
              <li key={tool}>
                <Link href={`${analysis}/${tool}`}>
                  <Icon name={TOOL_ICON[tool]} /> {t.analysis.tools[tool].name}
                </Link>
              </li>
            ))}
            {explainer ? (
              <li>
                <Link href={`/${lang}/learn/${explainer.slug}`}>
                  <Icon name="book" /> {explainer.title[lang]}
                </Link>
              </li>
            ) : null}
          </ul>
        </aside>
      </div>
    </article>
  );
}
