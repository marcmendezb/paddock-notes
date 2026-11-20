import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { EXPLAINERS } from "@/content";
import { GLOSSARY, GROUPS, glossaryBySlug } from "@/lib/glossary";
import { GlossaryFigure } from "@/components/glossary-figure";
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

/** A glossary entry (content.md §5.3): definition, example, see also and explainer. */
export default async function GlossaryTermPage({ params }: Props) {
  const { lang, term } = await load(params);
  const t = dict(lang);
  const e = term[lang];
  const explainer = term.explainer ? EXPLAINERS.find((x) => x.slug === term.explainer) : undefined;
  const group = GROUPS[term.group][lang];
  const siblings = GLOSSARY.filter((g) => g.group === term.group && g.slug !== term.slug);
  const i = GLOSSARY.findIndex((g) => g.slug === term.slug);
  const prev = GLOSSARY[(i - 1 + GLOSSARY.length) % GLOSSARY.length]!;
  const next = GLOSSARY[(i + 1) % GLOSSARY.length]!;
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
        kicker={`${t.learn.glossary} · ${group}`}
        title={e.term}
        lede={<p className="gl-def">{e.def}</p>}
      />
      <div className="container gl-page">
        <div className="gl-main">
          <figure className="gl-figure" data-surface="ink">
            <figcaption className="gl-figure-cap">
              <Icon name="eye" /> {t.learn.figure}
            </figcaption>
            <GlossaryFigure slug={term.slug} label={`${e.term}: ${e.def}`} />
          </figure>
          {e.example ? (
            <section className="gl-practice" aria-labelledby="practice">
              <h2 id="practice" className="reading-aside-title">
                {t.learn.inPractice}
              </h2>
              <p>{e.example}</p>
            </section>
          ) : null}
          {term.regulated ? <p className="reading-flag">{t.learn.regulated}</p> : null}
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

        <aside className="gl-side">
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
          <section aria-labelledby="group" className="gl-see">
            <h2 id="group" className="reading-aside-title">
              {t.learn.sameGroup(group)}
            </h2>
            <ul className="reading-links">
              {siblings.map((g) => (
                <li key={g.slug}>
                  <Link href={`/${lang}/learn/glossary/${g.slug}`}>{g[lang].term}</Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <nav className="gl-pager" aria-label={t.learn.glossary}>
          <Link href={`/${lang}/learn/glossary/${prev.slug}`} className="gl-pager-link">
            <span className="gl-pager-dir">← {t.learn.prevTerm}</span>
            <span className="gl-pager-term">{prev[lang].term}</span>
          </Link>
          <Link href={`/${lang}/learn/glossary/${next.slug}`} className="gl-pager-link is-next">
            <span className="gl-pager-dir">{t.learn.nextTerm} →</span>
            <span className="gl-pager-term">{next[lang].term}</span>
          </Link>
        </nav>
      </div>
    </article>
  );
}
