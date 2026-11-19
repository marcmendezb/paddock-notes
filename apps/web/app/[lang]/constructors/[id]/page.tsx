import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nationalityCountry } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PositionChart } from "@/components/charts/position-chart";
import { PositionBadge, ProfileHero, SeasonPoints } from "@/components/profile-view";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Params = { params: Promise<{ lang: string; id: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const profile = await api.constructorProfile(p.id);
  if (!profile) notFound();
  return { lang, profile: profile.data };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, profile } = await load(params);
  const name = profile.constructor.name;
  return {
    title: { es: `${name}: historia y estadísticas en F1`, en: `${name}: F1 history and stats`, de: `${name}: F1-Geschichte und Statistiken` }[lang],
    description: { es: `Temporadas, pilotos y títulos de ${name}.`, en: `Seasons, drivers and titles of ${name}.`, de: `Saisons, Fahrer und Titel von ${name}.` }[lang],
    alternates: {
      canonical: `/${lang}/constructors/${profile.constructor.id}`,
      languages: { es: `/es/constructors/${profile.constructor.id}`, en: `/en/constructors/${profile.constructor.id}`, de: `/de/constructors/${profile.constructor.id}` },
    },
  };
}

/** Ficha de equipo (NUC-42): sin logos, solo datos y tipografía. */
export default async function ConstructorPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const c = profile.constructor;

  const topPoints = Math.max(1, ...profile.seasons.map((x) => x.points ?? 0));
  const initials = c.name
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <article>
      <ProfileHero
        icon="wrench"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: c.name }]} />}
        kicker={[t.driver.teamKicker, nationalityCountry(lang, c.nationality)].filter(Boolean).join(" · ")}
        family={c.name}
        mark={initials || null}
        titles={profile.titles}
        titleLabel={t.team.titles}
        lede={t.team.lede(c.name, profile.seasons.length, profile.stats.wins)}
        stats={[
          { label: t.driver.stats.races, value: profile.stats.races },
          { label: t.driver.stats.wins, value: profile.stats.wins, accent: true },
          { label: t.driver.stats.poles, value: profile.stats.poles },
          { label: t.driver.stats.podiums, value: profile.stats.podiums },
        ]}
      />

      <div className="container stack-xl">
        <dl className="pf-more">
          <div>
            <dt>{t.driver.stats.points}</dt>
            <dd className="tabular">{formatPoints(lang, profile.stats.points)}</dd>
          </div>
          <div>
            <dt>{t.team.titles}</dt>
            <dd className="tabular">{profile.titles.length}</dd>
          </div>
          <div>
            <dt>{t.team.driverTitles}</dt>
            <dd className="tabular">{profile.driverTitles.length}</dd>
          </div>
          <div>
            <dt>{t.driver.seasons}</dt>
            <dd className="tabular">{profile.seasons.length}</dd>
          </div>
        </dl>

        {profile.driverTitles.length > 0 ? (
          <section aria-labelledby="driver-titles" className="rv-section">
            <h2 id="driver-titles" className="rv-h2">
              {t.team.driverTitles}
            </h2>
            <ul className="pf-champs">
              {profile.driverTitles.map((d) => (
                <li key={d.season}>
                  <Link href={`/${lang}/drivers/${d.driver.id}`} className="pf-champ">
                    <span className="pf-champ-year tabular">{d.season}</span>
                    <span className="pf-champ-name">{fullName(d.driver)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="seasons" className="rv-section">
          <h2 id="seasons" className="rv-h2">
            {t.driver.seasons}
          </h2>
          <div className="pf-chart">
            <PositionChart
              lang={lang}
              seasons={profile.seasons.map((x) => ({ season: x.season, position: x.position }))}
              title={t.driver.finalPositions}
            />
          </div>
          <div className="timing" data-surface="ink">
            <div className="table-wrap" tabIndex={0} role="region" aria-label={t.driver.seasons}>
              <table className="timing-table">
                <thead>
                  <tr>
                    <th scope="col">{t.team.seasonCols.season}</th>
                    <th scope="col">{t.team.seasonCols.drivers}</th>
                    <th scope="col" className="num">{t.team.seasonCols.wins}</th>
                    <th scope="col" className="st-points-col">{t.team.seasonCols.points}</th>
                    <th scope="col" className="num">{t.team.seasonCols.position}</th>
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
                      <td className="pf-drivers">{x.drivers.map((d) => fullName(d)).join(", ")}</td>
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
      </div>
    </article>
  );
}
