import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nationalityCountry } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PositionChart } from "@/components/charts/position-chart";
import { DriverLink } from "@/components/links";
import { StatGrid } from "@/components/stat-grid";
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
    title: lang === "es" ? `${name}: historia y estadísticas en F1` : `${name}: F1 history and stats`,
    description: lang === "es" ? `Temporadas, pilotos y títulos de ${name}.` : `Seasons, drivers and titles of ${name}.`,
    alternates: {
      canonical: `/${lang}/constructors/${profile.constructor.id}`,
      languages: { es: `/es/constructors/${profile.constructor.id}`, en: `/en/constructors/${profile.constructor.id}` },
    },
  };
}

/** Ficha de equipo (NUC-42): sin logos, solo datos y tipografía. */
export default async function ConstructorPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const c = profile.constructor;

  return (
    <article className="container stack-xl">
      <div className="stack">
        <Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: c.name }]} />
        <header className="stack-s">
          <p className="eyebrow">{nationalityCountry(lang, c.nationality)}</p>
          <h1>{c.name}</h1>
          <p className="lede">{t.team.lede(c.name, profile.seasons.length, profile.stats.wins)}</p>
        </header>
      </div>

      <StatGrid
        items={[
          { label: t.driver.stats.races, value: profile.stats.races },
          { label: t.driver.stats.wins, value: profile.stats.wins, detail: t.driver.rate(profile.stats.wins, profile.stats.races) },
          { label: t.driver.stats.poles, value: profile.stats.poles },
          { label: t.driver.stats.podiums, value: profile.stats.podiums },
          { label: t.driver.stats.points, value: formatPoints(lang, profile.stats.points) },
          { label: t.team.titles, value: profile.titles.length, detail: profile.titles.join(", ") || undefined },
          { label: t.team.driverTitles, value: profile.driverTitles.length },
        ]}
      />

      {profile.driverTitles.length > 0 ? (
        <section aria-labelledby="driver-titles" className="stack-s">
          <h2 id="driver-titles">{t.team.driverTitles}</h2>
          <ul className="link-list">
            {profile.driverTitles.map((d) => (
              <li key={d.season}>
                {d.season}: <DriverLink lang={lang} driver={d.driver} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="seasons" className="stack">
        <h2 id="seasons">{t.driver.seasons}</h2>
        <PositionChart
          lang={lang}
          seasons={profile.seasons.map((s) => ({ season: s.season, position: s.position }))}
          title={t.driver.finalPositions}
        />
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t.driver.seasons}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t.team.seasonCols.season}</th>
                <th scope="col">{t.team.seasonCols.drivers}</th>
                <th scope="col" className="num">{t.team.seasonCols.wins}</th>
                <th scope="col" className="num">{t.team.seasonCols.points}</th>
                <th scope="col" className="num">{t.team.seasonCols.position}</th>
              </tr>
            </thead>
            <tbody>
              {profile.seasons.map((s) => (
                <tr key={s.season}>
                  <th scope="row">
                    <Link href={`/${lang}/standings/${s.season}`}>{s.season}</Link>
                  </th>
                  <td>
                    {s.drivers.map((d, i) => (
                      <span key={d.id}>
                        {i > 0 ? ", " : ""}
                        <Link href={`/${lang}/drivers/${d.id}`}>{fullName(d)}</Link>
                      </span>
                    ))}
                  </td>
                  <td className="num">{s.wins}</td>
                  <td className="num">{s.points === null ? "—" : formatPoints(lang, s.points)}</td>
                  <td className="num">{s.position ? `P${s.position}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
