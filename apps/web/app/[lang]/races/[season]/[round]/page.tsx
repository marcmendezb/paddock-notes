import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { circuitTimeZone, gpName, gpShortName, noteFor, suggestedExplainer } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Icon } from "@/components/icons";
import { SessionList } from "@/components/session-list";
import { RaceBackdrop, RaceFacts, RaceHero, RaceNav, RacePreview, RaceTools, RecentWinners } from "@/components/race-view";
import { WeekendCalendar } from "@/components/weekend-calendar";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { CIRCUIT_OUTLINES } from "@/content/circuit-outlines";
import { RaceSubnav, type SubnavItem } from "@/components/race-subnav";
import { StaleNotice } from "@/components/site-chrome";
import { PitStopsTable } from "@/components/tables";
import { PitTimeline, QualifyingTower, ResultsTower } from "@/components/race-timing";
import { PositionsChart } from "@/components/race-recap";
import { api } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { favoriteSet } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { sportsEventLd } from "@/lib/structured-data";

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
    title: {
      es: `Resultados del ${gp} ${season}: clasificación, vuelta rápida y estrategia`,
      en: `${season} ${gp} results: classification, fastest lap and strategy`,
      de: `${gp} ${season}: Ergebnis, schnellste Runde und Strategie`,
    }[lang],
    description: {
      es: `Resultado completo, vuelta rápida y paradas del ${gp} ${season}.`,
      en: `Full result, fastest lap and pit stops of the ${season} ${gp}.`,
      de: `Vollständiges Ergebnis, schnellste Runde und Boxenstopps beim ${gp} ${season}.`,
    }[lang],
    alternates: {
      canonical: `/${lang}/races/${season}/${round}`,
      languages: { es: `/es/races/${season}/${round}`, en: `/en/races/${season}/${round}`, de: `/de/races/${season}/${round}` },
    },
  };
}

export default async function RacePage({ params }: Params) {
  const { lang, season, round, race: fetched } = await load(params);
  const t = dict(lang);
  const v = t.raceView;
  const race = fetched.data;
  const name = gpName(lang, race.name);
  const tz = circuitTimeZone(race.circuit.id);
  const [qualifying, sprint, pitStops, nav, analysis, favorites, layout] = await Promise.all([
    api.qualifying(season, round),
    race.isSprintWeekend ? api.sprint(season, round) : null,
    api.pitStops(season, round),
    api.navigation(season, round),
    season >= 2023 ? api.analysisIndex(season, round) : null,
    favoriteSet(),
    api.circuitLayout(race.circuit.id).catch(() => null),
  ]);
  // Con análisis, el gráfico de posiciones vuelta a vuelta (el mismo de la home).
  const [replay, strategy] = analysis
    ? await Promise.all([api.replay(season, round).catch(() => null), api.strategy(season, round).catch(() => null)])
    : [null, null];
  // Ganadores de este GP en los últimos años (en la previa de las carreras por llegar, y al final de todas).
  const recent = nav
    ? (
        await Promise.all(
          nav.data.otherYears.slice(0, 6).map((o) => api.race(o.season, o.round).catch(() => null)),
        )
      )
        .map((r) => (r?.data.results[0] ? { season: r.data.season, round: r.data.round, winner: fullName(r.data.results[0].driver), driverId: r.data.results[0].driver.id, team: r.data.results[0].constructor.name } : null))
        .filter((r) => r !== null)
    : [];
  const guide = CIRCUIT_GUIDES[race.circuit.id];
  const suggested = suggestedExplainer(race.circuit.id, race.isSprintWeekend, lang);
  // Sin telemetría, el trazado del GeoJSON de bacinger/f1-circuits (D-09).
  const outline = layout?.data.points ?? CIRCUIT_OUTLINES[race.circuit.id] ?? null;
  const [p1, p2, p3] = race.results;
  const fastest = race.results.find((r) => r.fastestLap?.rank === 1);
  const note = noteFor(season, round);
  const poleRow = qualifying?.data.find((q) => q.position === 1);
  const pole = poleRow ? { name: poleRow.driver.familyName, time: poleRow.q3 ?? poleRow.q2 ?? poleRow.q1 } : null;
  const w = analysis?.data.weather;
  const weather = w
    ? { value: w.air ? `${w.air.map((x) => Math.round(x)).join("–")} °C` : w.rain ? t.race2.rain : t.race2.dry, sub: w.air ? (w.rain ? t.race2.rain : t.race2.dry) : undefined }
    : null;
  const hasResult = race.results.length > 0;
  const hasSprint = Boolean(sprint && sprint.data.length > 0);
  const hasQuali = Boolean(qualifying && qualifying.data.length > 0);
  const hasPits = Boolean(pitStops && pitStops.data.length > 0);
  const tabs = [
    hasResult ? { id: "result", label: t.race.result, icon: "flag" } : null,
    replay ? { id: "story", label: v.storyTab, icon: "chart" } : null,
    analysis ? { id: "analysis", label: t.analysis.title, icon: "gauge" } : null,
    hasSprint ? { id: "sprint", label: t.race2.sprint, icon: "bolt" } : null,
    hasQuali ? { id: "qualifying", label: v.qualiTab, icon: "stopwatch" } : null,
    hasPits ? { id: "pitstops", label: t.race2.pitStops, icon: "wrench" } : null,
    !hasResult && race.sessions.some((s) => s.startsAt) ? { id: "weekend", label: v.weekend, icon: "calendar" } : null,
    !hasResult ? { id: "preview", label: v.preview, icon: "eye" } : null,
    recent.length ? { id: "winners", label: v.winners, icon: "trophy" } : null,
    hasResult && race.sessions.length ? { id: "sessions", label: t.race.sessions, icon: "clock" } : null,
  ].filter((x): x is SubnavItem => x !== null);

  return (
    <article className="rv">
      <JsonLd
        data={sportsEventLd(race, {
          lang,
          site: SITE_URL,
          name,
          description: {
            es: `Ronda ${race.round} del Mundial de Fórmula 1 de ${season} en ${race.circuit.name}.`,
            en: `Round ${race.round} of the ${season} Formula 1 World Championship at ${race.circuit.name}.`,
            de: `Runde ${race.round} der Formel-1-Weltmeisterschaft ${season} auf ${race.circuit.name}.`,
          }[lang],
        })}
      />
      {outline ? <RaceBackdrop points={outline} /> : null}
      <RaceHero
        lang={lang}
        race={race}
        outline={outline}
        breadcrumbs={
          <Breadcrumbs
            lang={lang}
            items={[
              { href: `/${lang}/races/${season}`, label: t.calendar.title(season) },
              { label: name },
            ]}
          />
        }
      />

      {tabs.length > 1 ? (
        <RaceSubnav
          label={v.onThisPage}
          round={`R${race.round} · ${season}`}
          name={gpShortName(lang, race.name)}
          items={tabs}
          prev={nav?.data.previous ? { href: `/${lang}/races/${nav.data.previous.season}/${nav.data.previous.round}`, label: `${t.race2.previous}: ${gpName(lang, nav.data.previous.name)}` } : null}
          next={nav?.data.next ? { href: `/${lang}/races/${nav.data.next.season}/${nav.data.next.round}`, label: `${t.race2.next}: ${gpName(lang, nav.data.next.name)}` } : null}
        />
      ) : null}

      <div className="container stack-xl">
        {fetched.stale ? <StaleNotice lang={lang} updatedAt={fetched.updatedAt} /> : null}

        <div className="rv-summary">
          {p1 && p2 && p3 ? (
            <p className="rv-lede">
              {t.race.lede(fullName(p1.driver), name, season, fullName(p2.driver), fullName(p3.driver))}
              {fastest?.fastestLap?.time ? ` ${t.race.fastest(fullName(fastest.driver), fastest.fastestLap.time)}` : ""}
            </p>
          ) : !hasResult ? (
            <p className="rv-lede">{v.upcomingLede(name, formatDate(lang, race.date))}</p>
          ) : null}
          <RaceFacts lang={lang} race={race} pole={pole} weather={weather} />
          {note ? (
            <Link href={`/${lang}/notes/${note.slug}`} className="rv-note" data-surface="ink">
              <span className="rv-note-kicker">
                <Icon name="book" /> {t.notes.readNote}
              </span>
              <span className="rv-note-title">{note.title[lang]}</span>
              <span className="rv-note-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : null}
        </div>


        {hasResult ? (
          <section aria-labelledby="result" className="rv-section" id="result-section">
            <h2 id="result" className="rv-h2">
              {t.race.result}
            </h2>
            {race.provisional ? (
              <p className="rv-provisional" role="note">
                <Icon name="clock" />
                <span>
                  <strong>{t.raceView.provisional}.</strong> {t.raceView.provisionalNote}
                </span>
              </p>
            ) : null}
            <ResultsTower lang={lang} results={race.results} favorites={favorites} label={t.race.result} />
          </section>
        ) : null}

        {replay ? (
          <section aria-labelledby="story" className="rv-section">
            <h2 id="story" className="rv-h2">
              {t.home.recap.story}
            </h2>
            <div className="rv-story">
              <PositionsChart lang={lang} race={race} replay={replay.data} strategy={strategy?.data ?? null} />
            </div>
          </section>
        ) : null}

        {analysis ? (
          <section aria-labelledby="analysis" className="rv-section">
            <h2 id="analysis" className="rv-h2">
              {v.analyse}
            </h2>
            <p className="rv-section-lede">{v.analyseLede}</p>
            <RaceTools lang={lang} season={season} round={round} tools={analysis.data.tools} />
          </section>
        ) : null}

        {hasSprint ? (
          <section aria-labelledby="sprint" className="rv-section">
            <h2 id="sprint" className="rv-h2">
              {t.race2.sprint}
            </h2>
            <ResultsTower lang={lang} results={sprint!.data} favorites={favorites} label={t.race2.sprint} />
          </section>
        ) : null}

        {hasQuali ? (
          <section aria-labelledby="qualifying" className="rv-section">
            <h2 id="qualifying" className="rv-h2">
              {v.qualiTitle}
            </h2>
            <p className="rv-section-lede">{v.qualiLede}</p>
            <QualifyingTower lang={lang} rows={qualifying!.data} label={t.race2.qualifying} />
          </section>
        ) : null}

        {hasPits ? (
          <section aria-labelledby="pitstops" className="rv-section">
            <h2 id="pitstops" className="rv-h2">
              {t.race2.pitStops}
            </h2>
            <p className="rv-section-lede">{t.race2.pitNote}</p>
            <PitTimeline
              lang={lang}
              stops={pitStops!.data}
              order={race.results}
              laps={race.results[0]?.laps ?? Math.max(...pitStops!.data.map((s) => s.lap))}
              table={<PitStopsTable lang={lang} rows={pitStops!.data} />}
            />
          </section>
        ) : null}

        {!hasResult && race.sessions.some((s) => s.startsAt) ? (
          <section aria-labelledby="weekend" className="rv-section">
            <h2 id="weekend" className="rv-h2">
              {v.weekend}
            </h2>
            <p className="rv-section-lede">{t.home.schedule}</p>
            <div className="timing rv-calendar" data-surface="ink">
              <WeekendCalendar
                lang={lang}
                sessions={race.sessions}
                circuitTimeZone={tz}
                serverNow={Date.now()}
                labels={{
                  sessions: t.sessions,
                  short: t.home.board.short,
                  circuitTime: t.home.circuitTime,
                  now: t.home.cotaNow,
                  live: t.home.board.live,
                  next: t.home.board.nextShort,
                }}
              />
            </div>
          </section>
        ) : null}

        {!hasResult ? (
          <section aria-labelledby="preview" className="rv-section">
            <h2 id="preview" className="rv-h2">
              {v.preview}
            </h2>
            <RacePreview
              lang={lang}
              circuitId={race.circuit.id}
              circuitName={race.circuit.name}
              hasGuide={Boolean(guide)}
              explainer={{ slug: suggested.explainer.slug, title: suggested.explainer.title[lang], reason: suggested.reason }}
            />
          </section>
        ) : null}

        {recent.length ? (
          <section aria-labelledby="winners" className="rv-section">
            <h2 id="winners" className="rv-h2">
              {v.winners}
            </h2>
            <p className="rv-section-lede">{v.winnersLede(name)}</p>
            <RecentWinners lang={lang} rows={recent} />
          </section>
        ) : null}

        {hasResult && race.sessions.length > 0 ? (
          <section aria-labelledby="sessions" className="rv-section">
            <h2 id="sessions" className="rv-h2">
              {t.race.sessions}
            </h2>
            <SessionList lang={lang} sessions={race.sessions} circuitTimeZone={tz} />
          </section>
        ) : null}

        {fetched.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, fetched.updatedAt))}</p> : null}

        {nav ? <RaceNav lang={lang} nav={nav.data} name={race.name} /> : null}
      </div>
    </article>
  );
}
