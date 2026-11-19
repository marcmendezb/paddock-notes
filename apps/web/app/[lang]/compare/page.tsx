import type { Metadata } from "next";
import Link from "next/link";
import type { DriverIndexEntry, DriverProfile, Lang } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHero } from "@/components/page-hero";
import { PositionBadge } from "@/components/profile-view";
import { Icon } from "@/components/icons";
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
  const [index, standings, loaded] = await Promise.all([
    api.drivers().catch(() => null),
    api.driverStandings("current").catch(() => null),
    api.seasons().catch(() => null),
  ]);
  const drivers = index?.data ?? [];
  // Sin elección, el duelo de los dos primeros del Mundial: la página nunca empieza vacía.
  const leaders = standings?.data.rows.slice(0, 2).map((r) => r.driver.id) ?? [];
  const [a, b] = await Promise.all([resolveDriver(q.a ?? leaders[0]), resolveDriver(q.b ?? leaders[1])]);
  const comparison = a && b && a !== b ? await api.compare(a, b) : null;
  // Las mismas temporadas cargadas que citan las fichas de piloto y equipo.
  const seasons = loaded?.data ?? [];
  const from = seasons.length ? Math.min(...seasons) : drivers.length ? Math.min(...drivers.map((d) => d.first)) : null;
  const to = seasons.length ? Math.max(...seasons) : drivers.length ? Math.max(...drivers.map((d) => d.last)) : null;
  const groups = [...new Set(drivers.map((d) => d.last))].map((season) => ({ season, list: drivers.filter((d) => d.last === season) }));
  const span = (d: DriverIndexEntry) => (d.first === d.last ? String(d.first) : `${d.first}–${d.last}`);
  const byId = new Map(drivers.map((d) => [d.driver.id, d]));

  const picker = (name: "a" | "b", label: string, value: string | null) => (
    <label className="cmp-pick">
      <span>{label}</span>
      <select name={name} defaultValue={value ?? ""} required>
        <option value="" disabled>
          {t.compare.pick}
        </option>
        {groups.map((g) => (
          <optgroup key={g.season} label={t.compare.group(g.season)}>
            {g.list.map((d) => (
              <option key={d.driver.id} value={d.driver.id}>
                {fullName(d.driver)} · {span(d)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <PageHero
        icon="user"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: t.compare.title }]} />}
        kicker={from !== null && to !== null ? t.compare.coverageShort(from, to) : t.history.title}
        title={t.compare.title}
        lede={
          <>
            <p>{t.compare.lede}</p>
            {from !== null && to !== null ? <p className="cmp-coverage">{t.compare.coverage(from, to, drivers.length)}</p> : null}
          </>
        }
      >
        <form action={`/${lang}/compare`} method="get" className="cmp-form">
          {picker("a", t.compare.a, comparison ? comparison.data.a.driver.id : a)}
          <span className="cmp-vs" aria-hidden="true">
            VS
          </span>
          {picker("b", t.compare.b, comparison ? comparison.data.b.driver.id : b)}
          <button type="submit" className="cmp-go">
            {t.compare.go}
          </button>
        </form>
      </PageHero>

      <div className="container stack-xl">
        {q.a && !a ? <p className="notice">{t.compare.notFound(q.a)}</p> : null}
        {q.b && !b ? <p className="notice">{t.compare.notFound(q.b)}</p> : null}
        {comparison ? (
          <Comparison
            lang={lang}
            {...comparison.data}
            spans={[byId.get(comparison.data.a.driver.id), byId.get(comparison.data.b.driver.id)].map((d) =>
              d ? t.compare.inData(span(d), d.races) : null,
            )}
            coverage={from !== null && to !== null ? t.compare.coverageShort(from, to) : null}
          />
        ) : null}
        <p className="nlx-demo">
          <Icon name="clock" />
          <span>{t.compare.growing}</span>
        </p>
      </div>
    </>
  );
}

function Comparison({
  lang,
  a,
  b,
  headToHead,
  spans,
  coverage,
}: {
  lang: Lang;
  spans: (string | null)[];
  coverage: string | null;
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
        {coverage ? (
          <p className="cmp-duel-kicker">
            <Icon name="calendar" /> {t.compare.title} · {coverage}
          </p>
        ) : null}
        <div className="cmp-names">
          <Link href={`/${lang}/drivers/${a.driver.id}`} className="cmp-name is-a">
            <span className="cmp-given">{a.driver.givenName}</span>
            <span className="cmp-family">{a.driver.familyName}</span>
            <span className="cmp-team">{teamOf(a)}</span>
            {spans[0] ? <span className="cmp-span">{spans[0]}</span> : null}
          </Link>
          <span className="cmp-vs-big" aria-hidden="true">
            VS
          </span>
          <Link href={`/${lang}/drivers/${b.driver.id}`} className="cmp-name is-b">
            <span className="cmp-given">{b.driver.givenName}</span>
            <span className="cmp-family">{b.driver.familyName}</span>
            <span className="cmp-team">{teamOf(b)}</span>
            {spans[1] ? <span className="cmp-span">{spans[1]}</span> : null}
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
