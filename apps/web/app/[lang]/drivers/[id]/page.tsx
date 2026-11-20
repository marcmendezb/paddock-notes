import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nationalityCountry } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TeamLink } from "@/components/links";
import { Icon } from "@/components/icons";
import { DataNote, PositionBadge, ProfileHero, RateRings, SeasonPoints, SeasonRibbon, TeammateBar } from "@/components/profile-view";
import { api } from "@/lib/api";
import { formatDate, formatPoints, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Params = { params: Promise<{ lang: string; id: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const profile = await api.driver(p.id);
  if (!profile) notFound();
  return { lang, profile: profile.data };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, profile } = await load(params);
  const name = fullName(profile.driver);
  return {
    title: { es: `${name}: estadísticas y carrera en F1`, en: `${name}: F1 stats and career`, de: `${name}: F1-Statistiken und Karriere` }[lang],
    description: {
      es: `Victorias, poles, podios y trayectoria de ${name} en la Fórmula 1.`,
      en: `Wins, poles, podiums and career of ${name} in Formula 1.`,
      de: `Siege, Poles, Podien und Karriere von ${name} in der Formel 1.`,
    }[lang],
    alternates: {
      canonical: `/${lang}/drivers/${profile.driver.id}`,
      languages: { es: `/es/drivers/${profile.driver.id}`, en: `/en/drivers/${profile.driver.id}`, de: `/de/drivers/${profile.driver.id}` },
    },
  };
}

export default async function DriverPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const { driver, stats } = profile;
  const name = fullName(driver);
  const country = nationalityCountry(lang, driver.nationality);

  const topPoints = Math.max(1, ...profile.seasons.map((x) => x.points));
  // Loaded seasons: the figures only count those (the history is loaded backwards).
  const loaded = (await api.seasons().catch(() => null))?.data ?? [];
  const from = loaded.length ? Math.min(...loaded) : (profile.seasons[0]?.season ?? null);
  const to = loaded.length ? Math.max(...loaded) : (profile.seasons.at(-1)?.season ?? null);
  const pct = (n: number) => (stats.races ? `${Math.round((n / stats.races) * 100)} %` : undefined);

  return (
    <article>
      <ProfileHero
        icon="user"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/standings`, label: t.nav.standings }, { label: name }]} />}
        kicker={[t.driver.kicker, country, driver.dateOfBirth ? t.driver.born(formatDate(lang, driver.dateOfBirth)) : null, from && to ? t.driver.dataSpan(from, to) : null]
          .filter(Boolean)
          .join(" · ")}
        given={driver.givenName}
        family={driver.familyName}
        mark={driver.number ? String(driver.number) : null}
        titles={profile.titles}
        titleLabel={t.driver.champion}
        lede={stats.firstRace ? t.driver.lede(name, stats.races, stats.firstRace.season, stats.wins, stats.podiums) : null}
        stats={[
          { label: t.driver.stats.races, value: stats.races },
          { label: t.driver.stats.wins, value: stats.wins, sub: pct(stats.wins), accent: true },
          { label: t.driver.stats.poles, value: stats.poles },
          { label: t.driver.stats.podiums, value: stats.podiums, sub: pct(stats.podiums) },
        ]}
      />

      <div className="container stack-xl">
        {from && to ? <DataNote lang={lang} from={from} to={to} /> : null}
        <section aria-labelledby="pace" className="pf-pace">
          <h2 id="pace" className="pf-mate-title">
            <Icon name="gauge" /> {t.driver.pace}
          </h2>
          <RateRings
            items={[
              { label: t.driver.winRate, value: stats.races ? stats.wins / stats.races : 0, text: pct(stats.wins) ?? "—", accent: true },
              { label: t.driver.podiumRate, value: stats.races ? stats.podiums / stats.races : 0, text: pct(stats.podiums) ?? "—" },
              {
                label: t.driver.pointsRate,
                value: stats.races ? Math.min(1, stats.points / stats.races / 25) : 0,
                text: stats.races ? new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 1 }).format(stats.points / stats.races) : "—",
              },
            ]}
          />
        </section>
        <div className="pf-row">
          <dl className="pf-more">
            <div>
              <dt>{t.driver.stats.points}</dt>
              <dd className="tabular">{formatPoints(lang, stats.points)}</dd>
            </div>
            <div>
              <dt>{t.driver.stats.best}</dt>
              <dd className="tabular">{stats.bestFinish ? `P${stats.bestFinish}` : "—"}</dd>
            </div>
            <div>
              <dt>{t.driver.stats.dnfs}</dt>
              <dd className="tabular">{stats.dnfs}</dd>
            </div>
            <div>
              <dt>{t.driver.stats.titles}</dt>
              <dd className="tabular">{profile.titles.length}</dd>
            </div>
          </dl>
          {profile.teammates.races > 0 ? <TeammateBar lang={lang} ahead={profile.teammates.ahead} races={profile.teammates.races} /> : null}
        </div>
        <details className="pf-defs">
          <summary>{t.driver.definitions}</summary>
          <p className="muted">{t.driver.definitionsText}</p>
        </details>

        <section aria-labelledby="seasons" className="rv-section">
          <h2 id="seasons" className="rv-h2">
            {t.driver.seasons}
          </h2>
          <SeasonRibbon
            lang={lang}
            title={t.driver.ribbon}
            winsLabel={t.standings2.winsShort}
            seasons={[...profile.seasons].reverse().map((x) => ({
              season: x.season,
              who: x.constructors.map((c) => c.name).join(" / "),
              position: x.position,
              wins: x.wins,
              points: x.points,
            }))}
          />
          <div className="timing" data-surface="ink">
            <div className="table-wrap" tabIndex={0} role="region" aria-label={t.driver.seasons}>
              <table className="timing-table">
                <thead>
                  <tr>
                    <th scope="col">{t.driver.seasonCols.season}</th>
                    <th scope="col">{t.driver.seasonCols.team}</th>
                    <th scope="col" className="num">{t.driver.seasonCols.races}</th>
                    <th scope="col" className="num">{t.driver.seasonCols.wins}</th>
                    <th scope="col" className="st-points-col">{t.driver.seasonCols.points}</th>
                    <th scope="col" className="num">{t.driver.seasonCols.position}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...profile.seasons].reverse().map((x) => (
                    <tr key={x.season} className={x.position === 1 ? "is-p1" : undefined}>
                      <th scope="row" className="timing-driver">
                        <span className="timing-who">
                          <Link href={`/${lang}/standings/${x.season}`}>{x.season}</Link>
                        </span>
                      </th>
                      <td>
                        {x.constructors.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 ? " / " : ""}
                            {/* Each team on one line ("Red Bull" broke in two); two teams can still wrap at the slash. */}
                            <span className="nowrap">
                              <TeamLink lang={lang} team={c} />
                            </span>
                          </span>
                        ))}
                      </td>
                      <td className="num tabular">{x.races}</td>
                      <td className="num tabular">{x.wins || "·"}</td>
                      <td className="st-points">
                        <SeasonPoints lang={lang} points={x.points} top={topPoints} />
                      </td>
                      <td className="num">
                        <PositionBadge position={x.position} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <Link href={`/${lang}/compare?a=${driver.id}`} className="st-recalc pf-compare" data-surface="ink">
          <span className="st-recalc-kicker">
            <Icon name="user" /> {fullName(driver)}
          </span>
          <span className="st-recalc-title">{t.driver.compareWith}</span>
          <span className="recap-note-arrow" aria-hidden="true">
            →
          </span>
        </Link>
        <p className="source">{t.source("Jolpica F1", formatDate(lang, new Date().toISOString()))}</p>
      </div>
    </article>
  );
}
