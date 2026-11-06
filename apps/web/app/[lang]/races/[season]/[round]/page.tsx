import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { circuitTimeZone, countryName, gpName } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { CircuitLink } from "@/components/links";
import { SessionList } from "@/components/session-list";
import { StaleNotice } from "@/components/site-chrome";
import { PitStopsTable, QualifyingTable, ResultsTable } from "@/components/tables";
import { api } from "@/lib/api";
import { formatDate, formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { favoriteSet } from "@/lib/session";
import { TOOL_ORDER } from "@/lib/tools";

type Params = { params: Promise<{ lang: string; season: string; round: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const round = parseRound(p.round);
  const race = await api.race(season, round);
  if (!race) notFound();
  return { lang, season, round, race };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, season, round, race } = await load(params);
  const gp = gpName(lang, race.data.name);
  return {
    title:
      lang === "es"
        ? `Resultados del ${gp} ${season}: clasificación, vuelta rápida y estrategia`
        : `${season} ${gp} results: classification, fastest lap and strategy`,
    description:
      lang === "es"
        ? `Resultado completo, vuelta rápida y paradas del ${gp} ${season}.`
        : `Full result, fastest lap and pit stops of the ${season} ${gp}.`,
    alternates: {
      canonical: `/${lang}/races/${season}/${round}`,
      languages: { es: `/es/races/${season}/${round}`, en: `/en/races/${season}/${round}` },
    },
  };
}

export default async function RacePage({ params }: Params) {
  const { lang, season, round, race: fetched } = await load(params);
  const t = dict(lang);
  const race = fetched.data;
  const name = gpName(lang, race.name);
  const tz = circuitTimeZone(race.circuit.id);
  const [qualifying, sprint, pitStops, nav, analysis, favorites] = await Promise.all([
    api.qualifying(season, round),
    race.isSprintWeekend ? api.sprint(season, round) : null,
    api.pitStops(season, round),
    api.navigation(season, round),
    season >= 2023 ? api.analysisIndex(season, round) : null,
    favoriteSet(),
  ]);
  const [p1, p2, p3] = race.results;
  const fastest = race.results.find((r) => r.fastestLap?.rank === 1);

  return (
    <article className="container stack-l">
      <Breadcrumbs
        lang={lang}
        items={[
          { href: `/${lang}/races/${season}`, label: t.calendar.title(season) },
          { label: name },
        ]}
      />
      <JsonLd
        data={{
          "@type": "SportsEvent",
          name: `${name}`,
          sport: "Formula 1",
          startDate: race.startsAt ?? race.date,
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: race.circuit.name,
            address: `${race.circuit.locality}, ${race.circuit.country}`,
          },
        }}
      />
      <header className="stack-s">
        <p className="eyebrow">
          {t.home.round(race.round, season)} · <span className="tabular">{formatDate(lang, race.date)}</span>
          {race.isSprintWeekend ? <span className="tag">{t.calendar.sprint}</span> : null}
        </p>
        <h1>{name}</h1>
        <p className="lede">
          <CircuitLink lang={lang} id={race.circuit.id} name={race.circuit.name} /> · {race.circuit.locality},{" "}
          {countryName(lang, race.circuit.country)}
        </p>
      </header>

      {fetched.stale ? <StaleNotice lang={lang} updatedAt={fetched.updatedAt} /> : null}

      {p1 && p2 && p3 ? (
        <p className="lede">
          {t.race.lede(fullName(p1.driver), name, season, fullName(p2.driver), fullName(p3.driver))}
          {fastest?.fastestLap?.time ? ` ${t.race.fastest(fullName(fastest.driver), fastest.fastestLap.time)}` : ""}
        </p>
      ) : null}

      {race.results.length > 0 ? (
        <section aria-labelledby="result" className="stack">
          <h2 id="result">{t.race.result}</h2>
          <ResultsTable lang={lang} results={race.results} favorites={favorites} />
        </section>
      ) : (
        <p className="notice">{t.race.notYet(formatDate(lang, race.date))}</p>
      )}

      {analysis ? (
        <section aria-labelledby="analysis" className="stack-s">
          <h2 id="analysis">{t.analysis.title}</h2>
          <ul className="link-list">
            {TOOL_ORDER.filter((tool) => analysis.data.tools.includes(tool)).map((tool) => (
              <li key={tool}>
                <Link href={`/${lang}/analysis/${season}/${round}/${tool}`}>{t.analysis.tools[tool].name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis?.data.weather ? (
        <section aria-labelledby="weather" className="stack-s">
          <h2 id="weather" className="h-small">
            {t.race2.weather}
          </h2>
          <p className="tabular">
            {[
              analysis.data.weather.air ? `${t.race2.air}: ${analysis.data.weather.air.map((v) => formatPoints(lang, v)).join("–")} °C` : null,
              analysis.data.weather.track ? `${t.race2.track}: ${analysis.data.weather.track.map((v) => formatPoints(lang, v)).join("–")} °C` : null,
              analysis.data.weather.rain ? t.race2.rain : t.race2.dry,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      ) : null}

      {sprint && sprint.data.length > 0 ? (
        <section aria-labelledby="sprint" className="stack">
          <h2 id="sprint">{t.race2.sprint}</h2>
          <ResultsTable lang={lang} results={sprint.data} favorites={favorites} />
        </section>
      ) : null}

      {qualifying && qualifying.data.length > 0 ? (
        <section aria-labelledby="qualifying" className="stack">
          <h2 id="qualifying">{t.race2.qualifying}</h2>
          <QualifyingTable lang={lang} rows={qualifying.data} />
        </section>
      ) : null}

      {pitStops && pitStops.data.length > 0 ? (
        <section aria-labelledby="pitstops" className="stack">
          <h2 id="pitstops">{t.race2.pitStops}</h2>
          <p className="muted">{t.race2.pitNote}</p>
          <PitStopsTable lang={lang} rows={pitStops.data} />
        </section>
      ) : null}

      {race.sessions.length > 0 ? (
        <section aria-labelledby="sessions" className="stack-s">
          <h2 id="sessions">{t.race.sessions}</h2>
          <SessionList lang={lang} sessions={race.sessions} circuitTimeZone={tz} />
        </section>
      ) : null}

      {fetched.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, fetched.updatedAt))}</p> : null}

      {nav ? (
        <nav aria-label={lang === "es" ? "Otras carreras" : "Other races"} className="stack-s">
          <ul className="link-list">
            {nav.data.previous ? (
              <li>
                ← <Link href={`/${lang}/races/${nav.data.previous.season}/${nav.data.previous.round}`}>
                  {t.race2.previous}: {gpName(lang, nav.data.previous.name)} {nav.data.previous.season}
                </Link>
              </li>
            ) : null}
            {nav.data.next ? (
              <li>
                <Link href={`/${lang}/races/${nav.data.next.season}/${nav.data.next.round}`}>
                  {t.race2.next}: {gpName(lang, nav.data.next.name)} {nav.data.next.season}
                </Link>{" "}
                →
              </li>
            ) : null}
          </ul>
          {nav.data.otherYears.length > 0 ? (
            <>
              <h2 className="h-small">{t.race2.otherYears(name)}</h2>
              <ul className="link-list">
                {nav.data.otherYears.slice(0, 30).map((o) => (
                  <li key={o.season}>
                    <Link href={`/${lang}/races/${o.season}/${o.round}`}>{o.season}</Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
      ) : null}
    </article>
  );
}
