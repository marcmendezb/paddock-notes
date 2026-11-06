import type { Metadata } from "next";
import Link from "next/link";
import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).history;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/history`, languages: { es: "/es/history", en: "/en/history" } },
  };
}

/** Portada del histórico: esta semana en la historia (HIS-08), récords, cara a cara y temporadas (HIS-09). */
export default async function HistoryPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const [events, seasons] = await Promise.all([api.thisWeek(), api.seasons()]);

  return (
    <div className="container stack-xl">
      <div className="stack-s">
        <h1>{t.history.title}</h1>
        <p className="lede">{t.history.lede}</p>
      </div>

      <section aria-labelledby="this-week" className="stack">
        <h2 id="this-week">{t.history.thisWeek}</h2>
        {events && events.data.length > 0 ? (
          <ul className="stack-s">
            {events.data.map((e) => (
              <li key={`${e.season}-${e.round}`}>
                <Link href={`/${lang}/races/${e.season}/${e.round}`}>
                  {t.history.thisWeekItem(e.season, gpName(lang, e.name), e.winner ? fullName(e.winner) : "—")}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.history.noEvents}</p>
        )}
      </section>

      <div className="cards">
        <section aria-labelledby="records" className="stack-s">
          <h2 id="records" className="h-small">
            <Link href={`/${lang}/records`}>{t.history.records}</Link>
          </h2>
          <p className="muted">{t.records.lede}</p>
        </section>
        <section aria-labelledby="predictions" className="stack-s">
          <h2 id="predictions" className="h-small">
            <Link href={`/${lang}/predictions`}>{t.predictions.title}</Link>
          </h2>
          <p className="muted">{t.predictions.lede}</p>
        </section>
        <section aria-labelledby="quiz" className="stack-s">
          <h2 id="quiz" className="h-small">
            <Link href={`/${lang}/quiz`}>{t.quiz.title}</Link>
          </h2>
          <p className="muted">{t.quiz.lede}</p>
        </section>
        <section aria-labelledby="simulator" className="stack-s">
          <h2 id="simulator" className="h-small">
            <Link href={`/${lang}/simulator`}>{t.simulator.title}</Link>
          </h2>
          <p className="muted">{t.simulator.lede}</p>
        </section>
        <section aria-labelledby="compare" className="stack-s">
          <h2 id="compare" className="h-small">
            <Link href={`/${lang}/compare`}>{t.history.compare}</Link>
          </h2>
          <p className="muted">{t.compare.lede}</p>
        </section>
      </div>

      <section aria-labelledby="seasons" className="stack">
        <h2 id="seasons">{t.history.seasons}</h2>
        {seasons ? (
          <ul className="link-list">
            {seasons.data.map((s) => (
              <li key={s}>
                <Link href={`/${lang}/races/${s}`}>{s}</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
