import type { Metadata } from "next";
import Link from "next/link";
import {
  circuitTimeZone,
  countryName,
  gpName,
  suggestedExplainer,
  type DriverStandingRow,
  type Lang,
  type RaceDetail,
  type Standings,
} from "@paddock/shared";
import { Countdown } from "@/components/countdown";
import { SessionList } from "@/components/session-list";
import { StaleNotice } from "@/components/site-chrome";
import { ConstructorStandingsTable, DriverStandingsTable } from "@/components/tables";
import { api, type Fetched } from "@/lib/api";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { NewsletterForm } from "@/components/newsletter-form";
import { parseLang } from "@/lib/params";
import { favoriteSet } from "@/lib/session";

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return {
    title: { absolute: `Paddock Notes · ${dict(lang).tagline}` },
    description:
      lang === "es"
        ? "Calendario, resultados y análisis visual de cada Gran Premio de Fórmula 1."
        : "Calendar, results and visual analysis of every Formula 1 Grand Prix.",
    alternates: { canonical: `/${lang}`, languages: { es: "/es", en: "/en" } },
  };
}

/** Un bloque que falla no tumba la página: muestra el aviso de error de datos (TRA-31, TRA-32). */
async function settle<T>(promise: Promise<Fetched<T> | null>): Promise<Fetched<T> | null | "error"> {
  try {
    return await promise;
  } catch {
    return "error";
  }
}

export default async function HomePage({ params }: Params) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const [next, last, drivers, constructors, favorites] = await Promise.all([
    settle(api.nextRace()),
    settle(api.lastRace()),
    settle(api.driverStandings("current")),
    settle(api.constructorStandings("current")),
    favoriteSet(),
  ]);
  // Solo se enlaza el análisis de la última carrera si ya está calculado (NUC-08).
  const lastAnalysed =
    last && last !== "error" && last.data.season >= 2023
      ? await api.analysisIndex(last.data.season, last.data.round).catch(() => null)
      : null;

  return (
    <>
      <section className="hero" data-surface="ink" aria-labelledby="next-gp">
        <div className="container">
          {next === "error" ? (
            <p className="notice">{t.error.data}</p>
          ) : next && !(last && last !== "error" && next.data.season > last.data.season) ? (
            <NextGrandPrix lang={lang} next={next} />
          ) : (
            // Sin carreras por disputar en la temporada: campeón y arranque de la siguiente (NUC-07).
            <SeasonOver lang={lang} drivers={drivers} nextSeason={next ? next.data : null} />
          )}
        </div>
      </section>

      <div className="container stack-xl">
        {last === "error" ? (
          <p className="notice">{t.error.data}</p>
        ) : last ? (
          <section aria-labelledby="last-race" className="stack">
            {last.stale ? <StaleNotice lang={lang} updatedAt={last.updatedAt} /> : null}
            <h2 id="last-race">{t.home.last(gpName(lang, last.data.name))}</h2>
            <ol className="podium">
              {last.data.results.slice(0, 3).map((r) => (
                <li key={r.driver.id}>
                  <span className="podium-pos">P{r.position}</span>
                  <span className="podium-name">{fullName(r.driver)}</span>
                  <span className="muted">{r.constructor.name}</span>
                </li>
              ))}
            </ol>
            {(() => {
              const fl = last.data.results.find((r) => r.fastestLap?.rank === 1);
              return fl?.fastestLap?.time ? (
                <p>
                  {t.home.fastestLap}: {fullName(fl.driver)} · <span className="tabular">{fl.fastestLap.time}</span>
                </p>
              ) : null;
            })()}
            <ul className="link-list">
              <li>
                <Link href={`/${lang}/races/${last.data.season}/${last.data.round}`}>{t.home.seeRace}</Link>
              </li>
              {lastAnalysed ? (
                <li>
                  <Link href={`/${lang}/analysis/${last.data.season}/${last.data.round}`}>{t.analysis.open}</Link>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="standings-summary" className="stack">
          <h2 id="standings-summary" className="visually-hidden">
            {t.nav.standings}
          </h2>
          <div className="grid-2">
            <div className="stack">
              <h3>{t.home.driversTop}</h3>
              {drivers === "error" ? (
                <p className="notice">{t.error.data}</p>
              ) : drivers ? (
                <DriverStandingsTable lang={lang} rows={drivers.data.rows} limit={5} favorites={favorites} />
              ) : (
                <p className="muted">{t.home.noData}</p>
              )}
            </div>
            <div className="stack">
              <h3>{t.home.constructorsTop}</h3>
              {constructors === "error" ? (
                <p className="notice">{t.error.data}</p>
              ) : constructors ? (
                <ConstructorStandingsTable lang={lang} rows={constructors.data.rows} limit={3} favorites={favorites} />
              ) : (
                <p className="muted">{t.home.noData}</p>
              )}
            </div>
          </div>
          <p>
            <Link href={`/${lang}/standings`}>{t.home.fullStandings}</Link>
          </p>
          {drivers && drivers !== "error" && drivers.updatedAt ? (
            <p className="source">{t.source("Jolpica F1", formatDate(lang, drivers.updatedAt))}</p>
          ) : null}
        </section>

        <section aria-labelledby="newsletter" className="stack-s">
          <h2 id="newsletter" className="h-small">
            {t.newsletter.inline}
          </h2>
          <NewsletterForm lang={lang} back="newsletter" lazy />
        </section>
      </div>
    </>
  );
}

function NextGrandPrix({ lang, next }: { lang: Lang; next: Fetched<RaceDetail> }) {
  const t = dict(lang);
  const race = next.data;
  const tz = circuitTimeZone(race.circuit.id);
  return (
    <div className="stack">
      <p className="eyebrow">
        {t.home.next} · {t.home.round(race.round, race.season)}
      </p>
      <h1 id="next-gp" className="gp-name">
        {gpName(lang, race.name)}
      </h1>
      <p className="lede">
        {race.circuit.name} · {race.circuit.locality}, {countryName(lang, race.circuit.country)}
      </p>
      {race.startsAt ? (
        <>
          <p className="visually-hidden">{t.home.startsOn(formatDateTime(lang, race.startsAt, tz ?? "UTC"))}</p>
          <p className="muted">{t.home.until}</p>
          <Countdown startsAt={race.startsAt} serverNow={Date.now()} units={t.home.units} startedLabel={t.home.started} />
        </>
      ) : null}
      {race.sessions.length > 0 ? (
        <div className="stack-s">
          <h2 className="h-small">{t.home.schedule}</h2>
          <SessionList lang={lang} sessions={race.sessions} circuitTimeZone={tz} />
        </div>
      ) : null}
      <SuggestedExplainer lang={lang} race={race} />
    </div>
  );
}

/** Explicador sugerido según el próximo circuito (NUC-09). */
function SuggestedExplainer({ lang, race }: { lang: Lang; race: RaceDetail }) {
  const { explainer, reason } = suggestedExplainer(race.circuit.id, race.isSprintWeekend, lang);
  return (
    <p>
      <span className="muted">{dict(lang).home.toUnderstand} </span>
      <Link href={`/${lang}/learn/${explainer.slug}`}>{explainer.title[lang]}</Link>
      <span className="muted"> · {reason}</span>
    </p>
  );
}

function SeasonOver({
  lang,
  drivers,
  nextSeason,
}: {
  lang: Lang;
  drivers: Fetched<Standings<DriverStandingRow>> | null | "error";
  /** Primer GP de la temporada siguiente, si su calendario ya está publicado. */
  nextSeason: RaceDetail | null;
}) {
  const t = dict(lang);
  const standings = drivers && drivers !== "error" ? drivers.data : null;
  const leader = standings?.rows[0];
  const following = (standings?.season ?? new Date().getUTCFullYear()) + 1;
  return (
    <div className="stack">
      <h1 id="next-gp" className="gp-name">
        {leader && standings ? t.home.seasonOver(fullName(leader.driver), standings.season) : t.home.noData}
      </h1>
      {nextSeason ? (
        <p className="lede">
          {t.home.nextSeason(nextSeason.season, gpName(lang, nextSeason.name), formatDate(lang, nextSeason.date))}{" "}
          <Link href={`/${lang}/races/${nextSeason.season}`}>{t.calendar.title(nextSeason.season)}</Link>
        </p>
      ) : (
        <p className="lede">{t.home.nextSeasonUnknown(following)}</p>
      )}
    </div>
  );
}
