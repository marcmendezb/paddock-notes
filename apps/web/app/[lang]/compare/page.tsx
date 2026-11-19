import type { Metadata } from "next";
import Link from "next/link";
import type { DriverProfile, Lang } from "@paddock/shared";
import { DriverPicker, type PickerDriver } from "@/components/driver-picker";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ a?: string; b?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const q = await searchParams;
  const t = dict(lang);
  return {
    title: q.a && q.b ? `${q.a} vs ${q.b}` : t.compare.title,
    description: t.compare.seasonLede,
    alternates: { canonical: `/${lang}/compare`, languages: { es: "/es/compare", en: "/en/compare", de: "/de/compare" } },
  };
}

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 1000) / 10} %` : "—");
const ID = /^[a-z0-9_-]{1,64}$/;

/**
 * Cara a cara (D-35): dos pilotos de la temporada en curso, y solo con sus carreras de este año. Se eligen
 * en la parrilla del Mundial (DriverPicker); sin elección, el duelo por el título (P1 frente a P2).
 */
export default async function ComparePage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const q = await searchParams;
  const t = dict(lang);
  const standings = await api.driverStandings("current").catch(() => null);
  const rows = standings?.data.rows ?? [];
  const season = standings?.data.season ?? new Date().getUTCFullYear();
  const round = standings?.data.round ?? 0;
  const drivers: PickerDriver[] = rows.map((r) => ({
    id: r.driver.id,
    code: r.driver.code ?? r.driver.familyName.slice(0, 3).toUpperCase(),
    given: r.driver.givenName,
    family: r.driver.familyName,
    team: r.constructors.map((c) => c.name).join(" / "),
    position: r.position,
  }));
  const inGrid = (id: string | undefined) => (id && ID.test(id) && drivers.some((d) => d.id === id) ? id : null);
  const a = inGrid(q.a) ?? drivers[0]?.id ?? null;
  const b = inGrid(q.b) ?? drivers.find((d) => d.id !== a)?.id ?? null;
  const comparison = a && b && a !== b ? await api.compareSeason(a, b, season).catch(() => null) : null;

  return (
    <>
      <PageHero
        icon="user"
        kicker={t.compare.seasonKicker(season, round)}
        title={t.compare.title}
        lede={
          <>
            <p>{t.compare.seasonLede}</p>
            <p className="cmp-coverage">{t.compare.seasonOnly(season, round)}</p>
          </>
        }
      >
        {drivers.length ? (
          <form action={`/${lang}/compare`} method="get" className="cmp-form cmp-form-pickers">
            <DriverPicker name="a" side="a" label={t.compare.a} drivers={drivers} value={a} change={t.compare.choose} />
            <span className="cmp-vs" aria-hidden="true">
              VS
            </span>
            <DriverPicker name="b" side="b" label={t.compare.b} drivers={drivers} value={b} change={t.compare.choose} />
            <button type="submit" className="cmp-go">
              {t.compare.go}
            </button>
          </form>
        ) : null}
      </PageHero>

      <div className="container stack-xl">
        {q.a && !inGrid(q.a) ? <p className="notice">{t.compare.notFound(q.a)}</p> : null}
        {q.b && !inGrid(q.b) ? <p className="notice">{t.compare.notFound(q.b)}</p> : null}
        {comparison ? <Comparison lang={lang} season={season} {...comparison.data} /> : null}
      </div>
    </>
  );
}

function Comparison({
  lang,
  season,
  a,
  b,
  headToHead,
}: {
  lang: Lang;
  season: number;
  a: DriverProfile;
  b: DriverProfile;
  headToHead: { races: { season: number; round: number; name: string; a: number; b: number }[]; aAhead: number; bAhead: number };
}) {
  const t = dict(lang);
  const nameA = fullName(a.driver);
  const nameB = fullName(b.driver);
  const num: [string, number, number, string, string, boolean?][] = [
    [t.driver.stats.races, a.stats.races, b.stats.races, String(a.stats.races), String(b.stats.races)],
    [t.driver.stats.points, a.stats.points, b.stats.points, formatPoints(lang, a.stats.points), formatPoints(lang, b.stats.points)],
    [t.driver.stats.wins, a.stats.wins, b.stats.wins, `${a.stats.wins} · ${pct(a.stats.wins, a.stats.races)}`, `${b.stats.wins} · ${pct(b.stats.wins, b.stats.races)}`],
    [t.driver.stats.poles, a.stats.poles, b.stats.poles, `${a.stats.poles} · ${pct(a.stats.poles, a.stats.races)}`, `${b.stats.poles} · ${pct(b.stats.poles, b.stats.races)}`],
    [t.driver.stats.podiums, a.stats.podiums, b.stats.podiums, `${a.stats.podiums} · ${pct(a.stats.podiums, a.stats.races)}`, `${b.stats.podiums} · ${pct(b.stats.podiums, b.stats.races)}`],
    [t.driver.stats.best, a.stats.bestFinish ? -a.stats.bestFinish : -99, b.stats.bestFinish ? -b.stats.bestFinish : -99, a.stats.bestFinish ? `P${a.stats.bestFinish}` : "—", b.stats.bestFinish ? `P${b.stats.bestFinish}` : "—"],
    [t.driver.stats.dnfs, a.stats.dnfs, b.stats.dnfs, String(a.stats.dnfs), String(b.stats.dnfs), true],
  ];
  const width = (v: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);
  const total = headToHead.aAhead + headToHead.bAhead;
  const teamOf = (p: DriverProfile) => p.seasons.at(-1)?.constructors.map((c) => c.name).join(" / ") ?? "";

  return (
    <div className="stack-xl">
      <section className="cmp-duel" data-surface="ink" aria-labelledby="stats">
        <p className="cmp-duel-kicker">
          <Icon name="calendar" /> {t.compare.title} · {season}
        </p>
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
                const best = label === t.driver.stats.best;
                const max = best ? 1 : Math.max(va, vb);
                const wa = best ? (va > -99 ? 100 - (Math.abs(va) - 1) * 4 : 0) : width(va, max);
                const wb = best ? (vb > -99 ? 100 - (Math.abs(vb) - 1) * 4 : 0) : width(vb, max);
                const aWins = lowerBetter ? va < vb : va > vb;
                const bWins = lowerBetter ? vb < va : vb > va;
                return (
                  <tr key={label}>
                    <td className={aWins ? "cmp-a is-win" : "cmp-a"}>
                      <span className="cmp-val tabular">{ta}</span>
                      <svg className="cmp-bar is-left" aria-hidden="true" focusable="false">
                        <rect x="0" y="0" width="100%" height="100%" className="cmp-rail" />
                        <rect x={`${(100 - wa).toFixed(2)}%`} y="0" width={`${wa.toFixed(2)}%`} height="100%" className="cmp-fill-a" />
                      </svg>
                    </td>
                    <th scope="row" className="cmp-label">
                      {label}
                    </th>
                    <td className={bWins ? "cmp-b is-win" : "cmp-b"}>
                      <span className="cmp-val tabular">{tb}</span>
                      <svg className="cmp-bar" aria-hidden="true" focusable="false">
                        <rect x="0" y="0" width="100%" height="100%" className="cmp-rail" />
                        <rect x="0" y="0" width={`${wb.toFixed(2)}%`} height="100%" className="cmp-fill-b" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="h2h" className="rv-section">
        <h2 id="h2h" className="rv-h2">
          {t.compare.raceByRace}
        </h2>
        {headToHead.races.length > 0 ? (
          <div className="cmp-h2h" data-surface="ink">
            <p className="pf-mate-line">{t.compare.headToHead(nameA, headToHead.aAhead, nameB, headToHead.bAhead, headToHead.races.length)}</p>
            <div className="cmp-split" aria-hidden="true">
              <svg width="100%" height="18" focusable="false">
                <rect x="0" y="0" width={total ? `${((headToHead.aAhead / total) * 100).toFixed(2)}%` : "50%"} height="18" className="cmp-fill-a" />
                <rect x={total ? `${((headToHead.aAhead / total) * 100).toFixed(2)}%` : "50%"} y="0" width={total ? `${((headToHead.bAhead / total) * 100).toFixed(2)}%` : "50%"} height="18" className="cmp-fill-b" />
              </svg>
              <span className="cmp-split-legend">
                <span>
                  {a.driver.familyName} <strong className="tabular">{headToHead.aAhead}</strong>
                </span>
                <span>
                  <strong className="tabular">{headToHead.bAhead}</strong> {b.driver.familyName}
                </span>
              </span>
            </div>
            <p className="rv-section-lede">{t.compare.raceByRaceHelp}</p>
            <ol className="cmp-races">
              {headToHead.races.map((r) => {
                const aAhead = r.a < r.b;
                return (
                  <li key={`${r.season}-${r.round}`} className={aAhead ? "is-a" : "is-b"}>
                    <Link href={`/${lang}/races/${r.season}/${r.round}`} title={r.name}>
                      <span className="cmp-race-round tabular">R{r.round}</span>
                      <span className="cmp-race-pos tabular">
                        P{r.a} · P{r.b}
                      </span>
                      <span className="visually-hidden">
                        {r.name}: {a.driver.familyName} P{r.a}, {b.driver.familyName} P{r.b}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="muted">{t.compare.noShared}</p>
        )}
      </section>
    </div>
  );
}
