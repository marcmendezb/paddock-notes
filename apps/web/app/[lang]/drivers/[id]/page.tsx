import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nationalityCountry } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PositionChart } from "@/components/charts/position-chart";
import { TeamLink } from "@/components/links";
import { StatGrid } from "@/components/stat-grid";
import { api } from "@/lib/api";
import { formatDate, formatPoints, fullName } from "@/lib/format";
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
    title: lang === "es" ? `${name}: estadísticas y carrera en F1` : `${name}: F1 stats and career`,
    description:
      lang === "es"
        ? `Victorias, poles, podios y trayectoria de ${name} en la Fórmula 1.`
        : `Wins, poles, podiums and career of ${name} in Formula 1.`,
    alternates: {
      canonical: `/${lang}/drivers/${profile.driver.id}`,
      languages: { es: `/es/drivers/${profile.driver.id}`, en: `/en/drivers/${profile.driver.id}` },
    },
  };
}

export default async function DriverPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const { driver, stats } = profile;
  const name = fullName(driver);
  const country = nationalityCountry(lang, driver.nationality);

  return (
    <article className="container stack-xl">
      <div className="stack">
        <Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: name }]} />
        <header className="stack-s">
          <p className="eyebrow">
            {[country, driver.number ? `#${driver.number}` : null, driver.dateOfBirth ? t.driver.born(formatDate(lang, driver.dateOfBirth)) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1>{name}</h1>
          {stats.firstRace ? (
            <p className="lede">{t.driver.lede(name, stats.races, stats.firstRace.season, stats.wins, stats.podiums)}</p>
          ) : null}
        </header>
      </div>

      <StatGrid
        items={[
          { label: t.driver.stats.races, value: stats.races },
          { label: t.driver.stats.wins, value: stats.wins, detail: t.driver.rate(stats.wins, stats.races) },
          { label: t.driver.stats.poles, value: stats.poles },
          { label: t.driver.stats.podiums, value: stats.podiums, detail: t.driver.rate(stats.podiums, stats.races) },
          { label: t.driver.stats.points, value: formatPoints(lang, stats.points) },
          { label: t.driver.stats.dnfs, value: stats.dnfs },
          { label: t.driver.stats.best, value: stats.bestFinish ? `P${stats.bestFinish}` : "—" },
          { label: t.driver.stats.titles, value: profile.titles.length, detail: profile.titles.join(", ") || undefined },
        ]}
      />
      <details>
        <summary>{t.driver.definitions}</summary>
        <p className="muted">{t.driver.definitionsText}</p>
      </details>

      {profile.teammates.races > 0 ? <p>{t.driver.teammates(profile.teammates.ahead, profile.teammates.races)}</p> : null}

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
                <th scope="col">{t.driver.seasonCols.season}</th>
                <th scope="col">{t.driver.seasonCols.team}</th>
                <th scope="col" className="num">{t.driver.seasonCols.races}</th>
                <th scope="col" className="num">{t.driver.seasonCols.wins}</th>
                <th scope="col" className="num">{t.driver.seasonCols.points}</th>
                <th scope="col" className="num">{t.driver.seasonCols.position}</th>
              </tr>
            </thead>
            <tbody>
              {profile.seasons.map((s) => (
                <tr key={s.season}>
                  <th scope="row">
                    <Link href={`/${lang}/standings/${s.season}`}>{s.season}</Link>
                  </th>
                  <td>
                    {s.constructors.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 ? " / " : ""}
                        <TeamLink lang={lang} team={c} />
                      </span>
                    ))}
                  </td>
                  <td className="num">{s.races}</td>
                  <td className="num">{s.wins}</td>
                  <td className="num">{formatPoints(lang, s.points)}</td>
                  <td className="num">{s.position ? `P${s.position}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p>
        <Link href={`/${lang}/compare?a=${driver.id}`}>{t.driver.compareWith}</Link>
      </p>
      <p className="source">{t.source("Jolpica F1", formatDate(lang, new Date().toISOString()))}</p>
    </article>
  );
}
