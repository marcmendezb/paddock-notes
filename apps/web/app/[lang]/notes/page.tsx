import type { Metadata } from "next";
import Link from "next/link";
import { NOTES } from "@paddock/shared";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).notes;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/notes`, languages: { es: "/es/notes", en: "/en/notes" } },
  };
}

/** Índice de notas post-carrera (CON-04), de la más reciente a la más antigua. */
export default async function NotesPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang).notes;
  const notes = [...NOTES].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="container stack-l prose">
      <h1>{t.title}</h1>
      <p className="lede">{t.lede}</p>
      {notes.length ? (
        <ul className="link-list stack">
          {notes.map((n) => (
            <li key={n.slug} className="stack-s">
              <p className="eyebrow">
                {n.season} · <span className="tabular">{formatDate(lang, n.date)}</span>
              </p>
              <h2 className="h-small">
                <Link href={`/${lang}/notes/${n.slug}`}>{n.title[lang]}</Link>
              </h2>
              <p className="muted">{n.description[lang]}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t.empty}</p>
      )}
    </div>
  );
}
