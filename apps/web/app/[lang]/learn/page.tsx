import type { Metadata } from "next";
import Link from "next/link";
import { NOTES } from "@paddock/shared";
import { CIRCUIT_GUIDES, CIRCUIT_NAMES } from "@/content/circuit-guides";
import { EXPLAINERS, GUIDE_SLUG } from "@/content";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/learn`, languages: { es: "/es/learn", en: "/en/learn" } },
  };
}

/** Portada de Aprende: guía de iniciación, explicadores y glosario. */
export default async function LearnPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  const guide = EXPLAINERS.find((e) => e.slug === GUIDE_SLUG)!;
  return (
    <div className="container stack-xl">
      <div className="stack-s">
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>
      </div>
      <section aria-labelledby="start" className="stack-s">
        <h2 id="start">{t.guide}</h2>
        <p className="lede">
          <Link href={`/${lang}/learn/${guide.slug}`}>{guide.title[lang]}</Link>
        </p>
      </section>
      {NOTES.length ? (
        <section aria-labelledby="notes" className="stack-s">
          <h2 id="notes">{dict(lang).notes.title}</h2>
          <ul className="link-list">
            {[...NOTES]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map((n) => (
                <li key={n.slug}>
                  <Link href={`/${lang}/notes/${n.slug}`}>{n.title[lang]}</Link>
                </li>
              ))}
          </ul>
          <p>
            <Link href={`/${lang}/notes`}>{dict(lang).notes.title}</Link>
          </p>
        </section>
      ) : null}
      <section aria-labelledby="circuit-guides" className="stack-s">
        <h2 id="circuit-guides">{dict(lang).learn.circuitGuides}</h2>
        <ul className="link-list">
          {Object.keys(CIRCUIT_GUIDES).map((id) => (
            <li key={id}>
              <Link href={`/${lang}/circuits/${id}#guide`}>{CIRCUIT_NAMES[id] ?? id}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="explainers" className="stack">
        <h2 id="explainers">{t.explainers}</h2>
        <ul className="cards">
          {EXPLAINERS.filter((e) => e.slug !== GUIDE_SLUG).map((e) => (
            <li key={e.slug}>
              <Link href={`/${lang}/learn/${e.slug}`}>{e.title[lang]}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="glossary" className="stack-s">
        <h2 id="glossary">
          <Link href={`/${lang}/learn/glossary`}>{t.glossary}</Link>
        </h2>
        <p className="muted">{t.glossaryLede}</p>
      </section>
    </div>
  );
}
