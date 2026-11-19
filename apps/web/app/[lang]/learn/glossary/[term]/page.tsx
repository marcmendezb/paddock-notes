import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { EXPLAINERS } from "@/content";
import { glossaryBySlug } from "@/lib/glossary";
import { dict } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { definedTermLd } from "@/lib/structured-data";
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
    title: { es: `${e.term}: qué significa en F1`, en: `${e.term}: what it means in F1`, de: `${e.term}: was es in der F1 bedeutet` }[lang],
    description: e.def,
    alternates: {
      canonical: `/${lang}/learn/glossary/${term.slug}`,
      languages: { es: `/es/learn/glossary/${term.slug}`, en: `/en/learn/glossary/${term.slug}`, de: `/de/learn/glossary/${term.slug}` },
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
    <article>
      <JsonLd
        data={definedTermLd({ id: term.slug, term: e.term, definition: e.def, setName: t.learn.glossary }, { lang, site: SITE_URL })}
      />
      <PageHero
        icon="book"
        size="m"
        crumbs={
          <Breadcrumbs
            lang={lang}
            items={[
              { href: `/${lang}/learn`, label: t.learn.title },
              { href: `/${lang}/learn/glossary`, label: t.learn.glossary },
              { label: e.term },
            ]}
          />
        }
        kicker={t.learn.glossary}
        title={e.term}
        lede={<p className="gl-def">{e.def}</p>}
      />
      <div className="container gl-body">
        {e.example ? (
          <p className="gl-example">
            <Icon name="eye" />
            <span>{e.example}</span>
          </p>
        ) : null}
        {term.regulated ? <p className="reading-flag">{t.learn.regulated}</p> : null}
        {term.see?.length ? (
          <section aria-labelledby="see" className="gl-see">
            <h2 id="see" className="reading-aside-title">
              {t.learn.seeAlso}
            </h2>
            <ul className="gl-chips">
              {term.see.map((slug) => {
                const other = glossaryBySlug(slug);
                return other ? (
                  <li key={slug}>
                    <Link href={`/${lang}/learn/glossary/${slug}`}>{other[lang].term}</Link>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        ) : null}
        {explainer ? (
          <Link href={`/${lang}/learn/${explainer.slug}`} className="tile gl-explainer">
            <span className="tile-icon">
              <Icon name="book" />
            </span>
            <span className="tile-arrow" aria-hidden="true">
              →
            </span>
            <span className="tile-title">{explainer.title[lang]}</span>
            <span className="tile-meta">{t.learn.explainer}</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
