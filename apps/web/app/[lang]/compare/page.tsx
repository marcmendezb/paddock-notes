import type { Metadata } from "next";
import Link from "next/link";
import type { DriverProfile, Lang } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { resolveDriver } from "@/lib/resolve";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ a?: string; b?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const q = await searchParams;
  const t = dict(lang);
  return {
    title: q.a && q.b ? `${q.a} vs ${q.b}` : t.compare.title,
    description: t.compare.lede,
    alternates: { canonical: `/${lang}/compare`, languages: { es: "/es/compare", en: "/en/compare" } },
  };
}

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 1000) / 10} %` : "—");

/** Cara a cara entre dos pilotos de cualquier época (HIS-01 a HIS-05). */
export default async function ComparePage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const q = await searchParams;
  const t = dict(lang);
  const [a, b] = await Promise.all([resolveDriver(q.a), resolveDriver(q.b)]);
  const comparison = a && b && a !== b ? await api.compare(a, b) : null;

  return (
    <div className="container stack-xl">
      <div className="stack">
        <Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: t.compare.title }]} />
        <h1>{t.compare.title}</h1>
        <p className="lede">{t.compare.lede}</p>
      </div>

      <form action={`/${lang}/compare`} method="get" className="inline-form">
        <label>
          {t.compare.a}
          <input type="text" name="a" defaultValue={comparison ? comparison.data.a.driver.id : q.a} required maxLength={50} />
        </label>
        <label>
          {t.compare.b}
          <input type="text" name="b" defaultValue={comparison ? comparison.data.b.driver.id : q.b} required maxLength={50} />
        </label>
        <button type="submit">{t.compare.go}</button>
      </form>

      {q.a && !a ? <p className="notice">{t.compare.notFound(q.a)}</p> : null}
      {q.b && !b ? <p className="notice">{t.compare.notFound(q.b)}</p> : null}

      {comparison ? <Comparison lang={lang} {...comparison.data} /> : null}
    </div>
  );
}

function Comparison({
  lang,
  a,
  b,
  headToHead,
}: {
  lang: Lang;
  a: DriverProfile;
  b: DriverProfile;
  headToHead: { races: { season: number; round: number; name: string; a: number; b: number }[]; aAhead: number; bAhead: number };
}) {
  const t = dict(lang);
  const nameA = fullName(a.driver);
  const nameB = fullName(b.driver);
  const rows: [string, (p: DriverProfile) => string][] = [
    [t.driver.stats.races, (p) => String(p.stats.races)],
    [t.driver.stats.wins, (p) => `${p.stats.wins} (${pct(p.stats.wins, p.stats.races)})`],
    [t.driver.stats.poles, (p) => `${p.stats.poles} (${pct(p.stats.poles, p.stats.races)})`],
    [t.driver.stats.podiums, (p) => `${p.stats.podiums} (${pct(p.stats.podiums, p.stats.races)})`],
    [t.driver.stats.points, (p) => formatPoints(lang, p.stats.points)],
    [t.driver.stats.dnfs, (p) => `${p.stats.dnfs} (${pct(p.stats.dnfs, p.stats.races)})`],
    [t.driver.stats.titles, (p) => String(p.titles.length)],
    [
      lang === "es" ? "Frente a sus compañeros" : "Against teammates",
      (p) => `${p.teammates.ahead}/${p.teammates.races} (${pct(p.teammates.ahead, p.teammates.races)})`,
    ],
  ];
  const longest = Math.max(a.seasons.length, b.seasons.length);

  return (
    <div className="stack-xl">
      <p className="muted">{t.compare.caveat}</p>

      <section aria-labelledby="stats" className="stack">
        <h2 id="stats">{t.compare.perRace}</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t.compare.perRace}>
          <table>
            <thead>
              <tr>
                <td />
                <th scope="col" className="num">
                  <Link href={`/${lang}/drivers/${a.driver.id}`}>{nameA}</Link>
                </th>
                <th scope="col" className="num">
                  <Link href={`/${lang}/drivers/${b.driver.id}`}>{nameB}</Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td className="num">{value(a)}</td>
                  <td className="num">{value(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="h2h" className="stack">
        <h2 id="h2h">{t.compare.shared}</h2>
        {headToHead.races.length > 0 ? (
          <>
            <p className="lede">
              {t.compare.headToHead(nameA, headToHead.aAhead, nameB, headToHead.bAhead, headToHead.races.length)}
            </p>
            <details>
              <summary>{t.compare.shared}</summary>
              <ul className="link-list">
                {headToHead.races.map((r) => (
                  <li key={`${r.season}-${r.round}`}>
                    <Link href={`/${lang}/races/${r.season}/${r.round}`}>
                      {r.season}/{r.round}
                    </Link>{" "}
                    P{r.a}–P{r.b}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="muted">{t.compare.noShared}</p>
        )}
      </section>

      <section aria-labelledby="career" className="stack">
        <h2 id="career">{t.compare.career}</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t.compare.career}>
          <table>
            <thead>
              <tr>
                <td />
                <th scope="col">{nameA}</th>
                <th scope="col">{nameB}</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: longest }, (_, i) => (
                <tr key={i}>
                  <th scope="row">{t.compare.careerCol(i + 1)}</th>
                  {[a, b].map((p) => {
                    const s = p.seasons[i];
                    return (
                      <td key={p.driver.id}>
                        {s ? `${s.season} · ${s.wins} ${t.driver.stats.wins.toLowerCase()} · ${s.position ? `P${s.position}` : "—"}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
