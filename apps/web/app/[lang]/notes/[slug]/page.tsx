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
import { TOOL_ORDER } from "@/lib/tools";

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
      languages: { es: `/es/notes/${note.slug}`, en: `/en/notes/${note.slug}` },
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
    <article className="container stack-l">
      <Breadcrumbs lang={lang} items={[{ href: `/${lang}/notes`, label: t.notes.title }, { label: note.title[lang] }]} />
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
      <header className="stack-s prose">
        <p className="eyebrow tabular">{formatDate(lang, note.date)}</p>
        <h1>{note.title[lang]}</h1>
      </header>
      <div className="article lede-first">
        <Body components={figureComponents(lang)} />
      </div>
      <section aria-labelledby="explore" className="stack-s prose">
        <h2 id="explore" className="h-small">
          {t.notes.tools}
        </h2>
        <ul className="link-list">
          <li>
            <Link href={`/${lang}/races/${note.season}/${note.round}`}>{t.notes.race}</Link>
          </li>
          {TOOL_ORDER.map((tool) => (
            <li key={tool}>
              <Link href={`${analysis}/${tool}`}>{t.analysis.tools[tool].name}</Link>
            </li>
          ))}
          {explainer ? (
            <li>
              <Link href={`/${lang}/learn/${explainer.slug}`}>{explainer.title[lang]}</Link>
            </li>
          ) : null}
        </ul>
      </section>
      <p className="source">
        {t.notes.published(formatDate(lang, note.date))} {t.notes.sources}
      </p>
    </article>
  );
}
