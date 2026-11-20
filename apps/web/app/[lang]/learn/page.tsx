import type { Metadata } from "next";
import Link from "next/link";
import { NOTES } from "@paddock/shared";
import { CIRCUIT_GUIDES, CIRCUIT_NAMES } from "@/content/circuit-guides";
import { EXPLAINERS, GUIDE_SLUG } from "@/content";
import { dict } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { GLOSSARY } from "@/lib/glossary";
import { Icon } from "@/components/icons";
import { HeroStats, PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/learn`, languages: { es: "/es/learn", en: "/en/learn", de: "/de/learn" } },
  };
}

/** The Learn landing page: beginner's guide, explainers and glossary. */
export default async function LearnPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  const guide = EXPLAINERS.find((e) => e.slug === GUIDE_SLUG)!;
  const explainers = EXPLAINERS.filter((e) => e.slug !== GUIDE_SLUG);
  const notes = [...NOTES].sort((a, b) => b.date.localeCompare(a.date));
  const guides = Object.keys(CIRCUIT_GUIDES);
  return (
    <>
      <PageHero
        icon="book"
        kicker={t.kicker}
        title={t.title}
        lede={<p>{t.lede}</p>}
        aside={
          <HeroStats
            items={[
              { label: t.statExplainers, value: explainers.length, accent: true },
              { label: t.statTerms, value: GLOSSARY.length },
              { label: t.statGuides, value: guides.length },
              { label: t.statNotes, value: notes.length },
            ]}
          />
        }
      />
      <div className="container stack-xl">
        <section aria-labelledby="start">
          <Link href={`/${lang}/learn/${guide.slug}`} className="ln-guide" data-surface="ink">
            <span className="ln-guide-kicker">
              <Icon name="flag" /> <span id="start">{t.guide}</span> · {t.minutes}
            </span>
            <span className="ln-guide-title">{guide.title[lang]}</span>
            <span className="ln-guide-text">{guide.description[lang]}</span>
            <span className="recap-note-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </section>

        <section aria-labelledby="explainers">
          <div className="section-head">
            <h2 id="explainers" className="section-title">
              {t.explainers}
            </h2>
          </div>
          <ul className="tiles">
            {explainers.map((e, i) => (
              <li key={e.slug}>
                <Link href={`/${lang}/learn/${e.slug}`} className="tile">
                  <span className="tile-n tabular" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="tile-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="tile-title">{e.title[lang]}</span>
                  <span className="tile-text tile-clamp">{e.description[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="ln-pair">
          {notes.length ? (
            <section aria-labelledby="notes">
              <div className="section-head">
                <h2 id="notes" className="section-title">
                  {dict(lang).notes.title}
                </h2>
                <Link href={`/${lang}/notes`} className="ln-more">
                  {t.allNotes} →
                </Link>
              </div>
              <ul className="ln-notes">
                {notes.slice(0, 3).map((n) => (
                  <li key={n.slug}>
                    <Link href={`/${lang}/notes/${n.slug}`}>
                      <span className="ln-note-date tabular">{formatDate(lang, n.date)}</span>
                      <span className="ln-note-title">{n.title[lang]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="circuit-guides">
            <div className="section-head">
              <h2 id="circuit-guides" className="section-title">
                {t.circuitGuides}
              </h2>
              <Link href={`/${lang}/learn/circuits`} className="ln-more">
                {t.allGuides} →
              </Link>
            </div>
            <ul className="tiles ln-guides">
              {guides.map((id) => (
                <li key={id}>
                  <Link href={`/${lang}/circuits/${id}`} className="tile">
                    <span className="tile-icon">
                      <Icon name="pin" />
                    </span>
                    <span className="tile-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="tile-title">{CIRCUIT_NAMES[id] ?? id}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="glossary">
          <Link href={`/${lang}/learn/glossary`} className="ln-glossary">
            <span className="ln-glossary-letters" aria-hidden="true">
              A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
            </span>
            <span id="glossary" className="ln-glossary-title">
              {t.glossary}
            </span>
            <span className="ln-glossary-text">{t.glossaryLede}</span>
            <span className="ln-more">{t.openGlossary} →</span>
          </Link>
        </section>
      </div>
    </>
  );
}
