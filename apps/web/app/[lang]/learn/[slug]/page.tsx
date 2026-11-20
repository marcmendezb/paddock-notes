import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { ExplainerBody, ExplainerToc, explainerSections } from "@/components/explainer-body";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { EXPLAINERS, GUIDE_SLUG, explainerBody } from "@/content";
import { dict } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { articleLd } from "@/lib/structured-data";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string; slug: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const explainer = EXPLAINERS.find((e) => e.slug === p.slug);
  const Body = explainer ? explainerBody(lang, explainer.slug) : null;
  if (!explainer || !Body) notFound();
  return { lang, explainer, Body };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, explainer } = await load(params);
  return {
    title: explainer.title[lang],
    description: explainer.description[lang],
    alternates: {
      canonical: `/${lang}/learn/${explainer.slug}`,
      languages: { es: `/es/learn/${explainer.slug}`, en: `/en/learn/${explainer.slug}`, de: `/de/learn/${explainer.slug}` },
    },
  };
}

/** An MDX explainer (CON-01) or the beginner's guide (CON-03). The first sentence answers the title. */
export default async function ExplainerPage({ params }: Props) {
  const { lang, explainer, Body } = await load(params);
  const t = dict(lang).learn;
  const list = EXPLAINERS;
  const i = list.findIndex((e) => e.slug === explainer.slug);
  const next = list[(i + 1) % list.length];
  const parts = explainerSections(Body);
  // The MDX lede repeats the header's description: it is not painted twice.
  const norm = (x: string) => x.replace(/\s+/g, " ").trim().slice(0, 60);
  const leadText = parts?.lead.map((n) => String((n.props as { children?: unknown }).children ?? "")).join(" ") ?? "";
  const lead = parts && norm(leadText) === norm(explainer.description[lang]) ? [] : (parts?.lead ?? []);
  return (
    <article>
      <JsonLd
        data={articleLd(
          { slug: explainer.slug, headline: explainer.title[lang], description: explainer.description[lang], dateModified: "2026-11-06" },
          { lang, site: SITE_URL },
        )}
      />
      <PageHero
        icon="book"
        size="m"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/learn`, label: t.title }, { label: explainer.title[lang] }]} />}
        kicker={t.explainer}
        title={explainer.title[lang]}
        lede={<p>{explainer.description[lang]}</p>}
      />
      <div className="container reading">
        <div className="reading-main">
          {parts ? (
            <ExplainerBody lead={lead} sections={parts.sections} chapters={explainer.slug === GUIDE_SLUG} />
          ) : (
            <div className="article lede-first">
              <Body />
            </div>
          )}
        </div>
        <aside className="reading-aside">
          {parts ? <ExplainerToc sections={parts.sections} label={t.contents} /> : null}
          <p className="reading-meta">
            <Icon name="clock" /> {t.updated}
          </p>
          {explainer.regulated ? <p className="reading-flag">{t.regulated}</p> : null}
          {next && next.slug !== explainer.slug ? (
            <Link href={`/${lang}/learn/${next.slug}`} className="tile">
              <span className="tile-meta">{t.explainer}</span>
              <span className="tile-arrow" aria-hidden="true">
                →
              </span>
              <span className="tile-title">{next.title[lang]}</span>
            </Link>
          ) : null}
          <Link href={`/${lang}/learn`} className="ln-more">
            ← {t.title}
          </Link>
        </aside>
      </div>
    </article>
  );
}
