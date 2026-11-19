import type { Metadata } from "next";
import { GlossarySearch } from "@/components/glossary-search";
import { HeroStats, PageHero } from "@/components/page-hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GLOSSARY, GROUPS, type GroupKey } from "@/lib/glossary";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  return {
    title: t.glossary,
    description: t.glossaryLede,
    alternates: { canonical: `/${lang}/learn/glossary`, languages: { es: "/es/learn/glossary", en: "/en/learn/glossary", de: "/de/learn/glossary" } },
  };
}

export default async function GlossaryPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const items = GLOSSARY.map((g) => ({ slug: g.slug, term: g[lang].term, def: g[lang].def, group: g.group }));
  return (
    <>
      <PageHero
        icon="book"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/learn`, label: t.learn.title }, { label: t.learn.glossary }]} />}
        kicker={t.learn.title}
        title={t.learn.glossary}
        lede={<p>{t.learn.glossaryLede}</p>}
        aside={<HeroStats items={[{ label: t.learn.statTerms, value: items.length, accent: true }]} />}
      />
      <div className="container gl-index">
        <GlossarySearch
          lang={lang}
          items={items}
          groups={(Object.keys(GROUPS) as GroupKey[]).map((key) => ({ key, label: GROUPS[key][lang] }))}
          label={t.learn.searchGlossary}
          empty={t.search.empty("{q}")}
        />
      </div>
    </>
  );
}
