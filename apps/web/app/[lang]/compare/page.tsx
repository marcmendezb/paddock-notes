import type { Metadata } from "next";
import Link from "next/link";
import type { DriverProfile, Lang } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHero } from "@/components/page-hero";
import { PositionBadge } from "@/components/profile-view";
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
    alternates: { canonical: `/${lang}/compare`, languages: { es: "/es/compare", en: "/en/compare", de: "/de/compare" } },
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
    <>
      <PageHero
        icon="user"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: t.compare.title }]} />}
        kicker={t.history.title}
        title={t.compare.title}
        lede={<p>{t.compare.lede}</p>}
      >
        <form action={`/${lang}/compare`} method="get" className="cmp-form">
          <label>
            <span>{t.compare.a}</span>
            <input type="text" name="a" defaultValue={comparison ? comparison.data.a.driver.id : q.a} required maxLength={50} />
          </label>
          <span className="cmp-vs" aria-hidden="true">
            VS
          </span>
          <label>
            <span>{t.compare.b}</span>
            <input type="text" name="b" defaultValue={comparison ? comparison.data.b.driver.id : q.b} required maxLength={50} />
          </label>
          <button type="submit" className="cmp-go">
            {t.compare.go}
          </button>
        </form>
      </PageHero>

      <div className="container stack-xl">
        {q.a && !a ? <p className="notice">{t.compare.notFound(q.a)}</p> : null}
        {q.b && !b ? <p className="notice">{t.compare.notFound(q.b)}</p> : null}
        {comparison ? <Comparison lang={lang} {...comparison.data} /> : null}
      </div>
    </>
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
  const longest = Math.max(a.seasons.length, b.seasons.length);
  const num: [string, number, number, string, string, boolean?][] = [
    [t.driver.stats.races, a.stats.races, b.stats.races, String(a.stats.races), String(b.stats.races)],
    [t.driver.stats.wins, a.stats.wins, b.stats.wins, `${a.stats.wins} · ${pct(a.stats.wins, a.stats.races)}`, `${b.stats.wins} · ${pct(b.stats.wins, b.stats.races)}`],
    [t.driver.stats.poles, a.stats.poles, b.stats.poles, `${a.stats.poles} · ${pct(a.stats.poles, a.stats.races)}`, `${b.stats.poles} · ${pct(b.stats.poles, b.stats.races)}`],
    [t.driver.stats.podiums, a.stats.podiums, b.stats.podiums, `${a.stats.podiums} · ${pct(a.stats.podiums, a.stats.races)}`, `${b.stats.podiums} · ${pct(b.stats.podiums, b.stats.races)}`],
    [t.driver.stats.points, a.stats.points, b.stats.points, formatPoints(lang, a.stats.points), formatPoints(lang, b.stats.points)],
    [t.driver.stats.titles, a.titles.length, b.titles.length, String(a.titles.length), String(b.titles.length)],
    [t.driver.stats.dnfs, a.stats.dnfs, b.stats.dnfs, `${a.stats.dnfs} · ${pct(a.stats.dnfs, a.stats.races)}`, `${b.stats.dnfs} · ${pct(b.stats.dnfs, b.stats.races)}`, true],
  ];
  const bar = (v: number, max: number) => `${max ? ((v / max) * 100).toFixed(2) : 0}%`;
  const total = headToHead.aAhead + headToHead.bAhead;
  const teamOf = (p: DriverProfile) => p.seasons.at(-1)?.constructors.map((c) => c.name).join(" / ") ?? "";

  return (
    <div className="stack-xl">
      <section className="cmp-duel" data-surface="ink" aria-labelledby="stats">
        <div className="cmp-names">
          <Link href={`/${lang}/drivers/${a.driver.id}`} className="cmp-name is-a">
            <span className="cmp-given">{a.driver.givenName}</span>
            <span className="cmp-family">{a.driver.familyName}</span>
            <span className="cmp-team">{teamOf(a)}</span>
          </Link>
          <span className="cmp-vs-big" aria-hidden="true">
            VS
          </span>
          <Link href={`/${lang}/drivers/${b.driver.id}`} className="cmp-name is-b">
            <span className="cmp-given">{b.driver.givenName}</span>
            <span className="cmp-family">{b.driver.familyName}</span>
            <span className="cmp-team">{teamOf(b)}</span>
          </Link>
        </div>
        <h2 id="stats" className="visually-hidden">
          {t.compare.perRace}
        </h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t.compare.perRace}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th scope="col" className="cmp-a">{nameA}</th>
                <td />
                <th scope="col" className="cmp-b">{nameB}</th>
              </tr>
            </thead>
            <tbody>
              {num.map(([label, va, vb, ta, tb, lowerBetter]) => {
                const max = Math.max(va, vb);
                const aWins = lowerBetter ? va < vb : va > vb;
                const bWins = lowerBetter ? vb < va : vb > va;
                return (
                  <tr key={label}>
                    <td className={aWins ? "cmp-a is-win" : "cmp-a"}>
                      <span className="cmp-val tabular">{ta}</span>
                      <svg className="cmp-bar is-left" aria-hidden="true" focusable="false">
                        <rect x="0" y="0" width="100%" height="100%" className="cmp-rail" />
                        <rect x={`${(100 - (max ? (va / max) * 100 : 0)).toFixed(2)}%`} y="0" width={bar(va, max)} height="100%" className="cmp-fill-a" />
                      </svg>
                    </td>
                    <th scope="row" className="cmp-label">
                      {label}
                    </th>
                    <td className={bWins ? "cmp-b is-win" : "cmp-b"}>
                      <span className="cmp-val tabular">{tb}</span>
                      <svg className="cmp-bar" aria-hidden="true" focusable="false">
                        <rect x="0" y="0" width="100%" height="100%" className="cmp-rail" />
                        <rect x="0" y="0" width={bar(vb, max)} height="100%" className="cmp-fill-b" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted cmp-caveat">{t.compare.caveat}</p>

      <section aria-labelledby="h2h" className="rv-section">
        <h2 id="h2h" className="rv-h2">
          {t.compare.shared}
        </h2>
        {headToHead.races.length > 0 ? (
          <div className="cmp-h2h">
            <p className="pf-mate-line">{t.compare.headToHead(nameA, headToHead.aAhead, nameB, headToHead.bAhead, headToHead.races.length)}</p>
            <div className="cmp-split" aria-hidden="true">
              <span className="cmp-split-a" data-n={headToHead.aAhead}>
                <svg width="100%" height="18" focusable="false">
                  <rect x="0" y="0" width={total ? `${((headToHead.aAhead / total) * 100).toFixed(2)}%` : "50%"} height="18" className="cmp-fill-a" />
                  <rect x={total ? `${((headToHead.aAhead / total) * 100).toFixed(2)}%` : "50%"} y="0" width={total ? `${((headToHead.bAhead / total) * 100).toFixed(2)}%` : "50%"} height="18" className="cmp-fill-b" />
                </svg>
              </span>
              <span className="cmp-split-legend">
                <span>
                  {a.driver.familyName} <strong className="tabular">{headToHead.aAhead}</strong>
                </span>
                <span>
                  <strong className="tabular">{headToHead.bAhead}</strong> {b.driver.familyName}
                </span>
              </span>
            </div>
            <details className="pf-defs">
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
          </div>
        ) : (
          <p className="muted">{t.compare.noShared}</p>
        )}
      </section>

      <section aria-labelledby="career" className="rv-section">
        <h2 id="career" className="rv-h2">
          {t.compare.career}
        </h2>
        <div className="timing" data-surface="ink">
          <div className="table-wrap" tabIndex={0} role="region" aria-label={t.compare.career}>
            <table className="timing-table">
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
                    <th scope="row" className="timing-driver">
                      {t.compare.careerCol(i + 1)}
                    </th>
                    {[a, b].map((p) => {
                      const x = p.seasons[i];
                      return (
                        <td key={p.driver.id}>
                          {x ? (
                            <>
                              <span className="tabular">{x.season}</span> · {x.wins} {t.driver.stats.wins.toLowerCase()} · <PositionBadge position={x.position} />
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
