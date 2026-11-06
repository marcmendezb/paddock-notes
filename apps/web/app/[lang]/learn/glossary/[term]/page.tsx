import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { EXPLAINERS } from "@/content";
import { glossaryBySlug } from "@/lib/glossary";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string; term: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const term = glossaryBySlug(p.term);
  if (!term) notFound();
  return { lang, term };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, term } = await load(params);
  const e = term[lang];
  return {
    title: lang === "es" ? `${e.term}: qué significa en F1` : `${e.term}: what it means in F1`,
    description: e.def,
    alternates: {
      canonical: `/${lang}/learn/glossary/${term.slug}`,
      languages: { es: `/es/learn/glossary/${term.slug}`, en: `/en/learn/glossary/${term.slug}` },
    },
  };
}

/** Entrada de glosario (contenido.md §5.3): definición, ejemplo, ver también y explicador. */
export default async function GlossaryTermPage({ params }: Props) {
  const { lang, term } = await load(params);
  const t = dict(lang);
  const e = term[lang];
  const explainer = term.explainer ? EXPLAINERS.find((x) => x.slug === term.explainer) : undefined;
  return (
    <article className="container stack-l prose">
      <Breadcrumbs
        lang={lang}
        items={[
          { href: `/${lang}/learn`, label: t.learn.title },
          { href: `/${lang}/learn/glossary`, label: t.learn.glossary },
          { label: e.term },
        ]}
      />
      <JsonLd
        data={{
          "@type": "DefinedTerm",
          name: e.term,
          description: e.def,
          inLanguage: lang,
          inDefinedTermSet: { "@type": "DefinedTermSet", name: t.learn.glossary },
        }}
      />
      <h1>{e.term}</h1>
      <p className="lede">{e.def}</p>
      {e.example ? <p className="muted">{e.example}</p> : null}
      {term.regulated ? <p className="source">{t.learn.regulated}</p> : null}
      {term.see?.length ? (
        <p>
          {t.learn.seeAlso}:{" "}
          {term.see.map((slug, i) => {
            const other = glossaryBySlug(slug);
            return other ? (
              <span key={slug}>
                {i > 0 ? " · " : ""}
                <Link href={`/${lang}/learn/glossary/${slug}`}>{other[lang].term}</Link>
              </span>
            ) : null;
          })}
        </p>
      ) : null}
      {explainer ? (
        <p>
          {t.learn.explainer}: <Link href={`/${lang}/learn/${explainer.slug}`}>{explainer.title[lang]}</Link>
        </p>
      ) : null}
    </article>
  );
}
