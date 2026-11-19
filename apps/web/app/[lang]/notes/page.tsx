import type { Metadata } from "next";
import Link from "next/link";
import { NOTES } from "@paddock/shared";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).notes;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/notes`, languages: { es: "/es/notes", en: "/en/notes", de: "/de/notes" } },
  };
}

/** Índice de notas post-carrera (CON-04), de la más reciente a la más antigua. */
export default async function NotesPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang).notes;
  const notes = [...NOTES].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <PageHero icon="flag" kicker={dict(lang).learn.title} title={t.title} lede={<p>{t.lede}</p>} />
      <div className="container">
        {notes.length ? (
          <ul className="nt-list">
            {notes.map((n, i) => (
              <li key={n.slug}>
                <Link href={`/${lang}/notes/${n.slug}`} className={i === 0 ? "nt-card is-first" : "nt-card"} data-surface={i === 0 ? "ink" : undefined}>
                  <span className="nt-date tabular">
                    {n.season} · {formatDate(lang, n.date)}
                  </span>
                  <span className="nt-title">{n.title[lang]}</span>
                  <span className="nt-text">{n.description[lang]}</span>
                  <span className="nt-cta">{t.readNote} →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.empty}</p>
        )}
      </div>
    </>
  );
}
