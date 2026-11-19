import type { Metadata } from "next";
import Link from "next/link";
import type { SearchResult } from "@paddock/shared";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return { title: dict(lang).search.title, robots: { index: false } };
}

const HREF: Record<SearchResult["kind"], string> = { driver: "drivers", constructor: "constructors", circuit: "circuits" };

/** Búsqueda global (TRA-03). Formulario GET: funciona sin JavaScript; el atajo "/" lo abre. */
export default async function SearchPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const q = ((await searchParams).q ?? "").trim().slice(0, 50);
  const t = dict(lang).search;
  const results = q.length >= 2 ? await api.search(q) : null;

  return (
    <>
      <PageHero icon="search" size="m" kicker={t.label} title={t.title}>
        <form action={`/${lang}/search`} method="get" role="search" className="srch-form">
          <label>
            <span className="visually-hidden">{t.label}</span>
            <input type="search" name="q" defaultValue={q} minLength={2} maxLength={50} autoFocus placeholder={t.label} />
          </label>
          <button type="submit" className="cmp-go">
            {t.button}
          </button>
        </form>
      </PageHero>
      <div className="container stack-l">
      {results && results.data.length > 0 ? (
        <ul className="tiles" aria-live="polite">
          {results.data.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <Link href={`/${lang}/${HREF[r.kind]}/${r.id}`} className="tile">
                <span className="tile-icon">
                  <Icon name={r.kind === "driver" ? "user" : r.kind === "constructor" ? "wrench" : "pin"} />
                </span>
                <span className="tile-arrow" aria-hidden="true">
                  →
                </span>
                <span className="tile-title">{r.label}</span>
                <span className="tile-meta">
                  {t.kinds[r.kind]}
                  {r.detail ? ` · ${r.detail}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : q.length >= 2 ? (
        <p>{t.empty(q)}</p>
      ) : null}
      </div>
    </>
  );
}
