import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { EXPLAINERS, explainerBody } from "@/content";
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
      languages: { es: `/es/learn/${explainer.slug}`, en: `/en/learn/${explainer.slug}` },
    },
  };
}

/** Explicador en MDX (CON-01) o guía de iniciación (CON-03). La primera frase responde al título. */
export default async function ExplainerPage({ params }: Props) {
  const { lang, explainer, Body } = await load(params);
  const t = dict(lang).learn;
  return (
    <article className="container stack-l">
      <Breadcrumbs lang={lang} items={[{ href: `/${lang}/learn`, label: t.title }, { label: explainer.title[lang] }]} />
      <JsonLd
        data={articleLd(
          { slug: explainer.slug, headline: explainer.title[lang], description: explainer.description[lang], dateModified: "2026-11-06" },
          { lang, site: SITE_URL },
        )}
      />
      <h1>{explainer.title[lang]}</h1>
      <div className="article lede-first">
        <Body />
      </div>
      <p className="source">
        {t.updated}
        {explainer.regulated ? ` ${t.regulated}` : ""}
      </p>
    </article>
  );
}
