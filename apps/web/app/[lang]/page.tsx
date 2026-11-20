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
import { HeroVideo } from "@/components/hero-video";
import { Icon } from "@/components/icons";
import { LapStage } from "@/components/lap-stage";
import { LocalTime } from "@/components/local-time";
import { SessionList } from "@/components/session-list";
import { WeekendCalendar } from "@/components/weekend-calendar";
import { StaleNotice } from "@/components/site-chrome";
import { api, type Fetched } from "@/lib/api";
import { formatDate, formatDateTime, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { NewsletterBand } from "@/components/newsletter-band";
import { NewsletterForm } from "@/components/newsletter-form";
import { RaceReport } from "@/components/race-report";
import { TitleFight } from "@/components/title-fight";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { splitGpName, wordSize } from "@/lib/gp-title";
import { parseLang } from "@/lib/params";
import { favoriteSet } from "@/lib/session";

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return {
    title: { absolute: `Paddock Notes · ${dict(lang).tagline.replace(/\.$/, "")}` },
    description: {
      es: "Calendario, resultados y análisis visual de cada Gran Premio de Fórmula 1.",
      en: "Calendar, results and visual analysis of every Formula 1 Grand Prix.",
      de: "Kalender, Ergebnisse und visuelle Analyse jedes Formel-1-Grand-Prix.",
    }[lang],
    alternates: { canonical: `/${lang}`, languages: { es: "/es", en: "/en", de: "/de" } },
  };
}

/** A block that fails does not bring the page down: it shows the data error notice (TRA-31, TRA-32). */
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
  const [next, last, drivers, constructors, favorites, schedule] = await Promise.all([
    settle(api.nextRace()),
    settle(api.lastRace()),
    settle(api.driverStandings("current")),
    settle(api.constructorStandings("current")),
    favoriteSet(),
    settle(api.schedule("current")),
  ]);
  // The last race's analysis is only linked if it has been computed (NUC-08).
  const lastAnalysed =
    last && last !== "error" && last.data.season >= 2023
      ? await api.analysisIndex(last.data.season, last.data.round).catch(() => null)
      : null;

  // The winner's lap-by-lap positions (for the hero) and the layout of the last race's circuit,
  // for the report's background.
  const [recapReplay, recapCircuit] =
    last && last !== "error"
      ? await Promise.all([
          lastAnalysed ? api.replay(last.data.season, last.data.round).catch(() => null) : null,
          api.circuitLayout(last.data.circuit.id).catch(() => null),
        ])
      : [null, null];

  return (
    <>
      <section className="hero" data-surface="ink" aria-labelledby="next-gp">
        <HeroVideo />
        <div className="container">
          {next === "error" ? (
            <p className="notice">{t.error.data}</p>
          ) : next && !(last && last !== "error" && next.data.season > last.data.season) ? (
            <NextGrandPrix lang={lang} next={next} previous={last && last !== "error" ? last.data : null} />
          ) : (
            // No races left in the season: the champion and the start of the next one (NUC-07).
            <SeasonOver
              lang={lang}
              drivers={drivers}
              nextSeason={next ? next.data : null}
              previous={last && last !== "error" ? last.data : null}
            />
          )}
        </div>
      </section>

      {last && last !== "error" ? (
        <>
          {last.stale ? (
            <div className="container">
              <StaleNotice lang={lang} updatedAt={last.updatedAt} />
            </div>
          ) : null}
          <RaceReport
            lang={lang}
            race={last.data}
            hasAnalysis={Boolean(lastAnalysed)}
            circuit={recapCircuit?.data.points ?? null}
          />
        </>
      ) : null}

      {drivers === "error" || constructors === "error" ? (
        <div className="container">
          <p className="notice">{t.error.data}</p>
        </div>
      ) : null}
      <TitleFight
        lang={lang}
        drivers={drivers && drivers !== "error" ? drivers.data : null}
        constructors={constructors && constructors !== "error" ? constructors.data : null}
        remainingRounds={
          schedule && schedule !== "error"
            ? schedule.data
                .filter((r) => r.status === "next" || r.status === "upcoming")
                .map((r) => ({ isSprintWeekend: r.isSprintWeekend }))
            : null
        }
        favorites={favorites}
        updatedAt={drivers && drivers !== "error" ? drivers.updatedAt ?? null : null}
      />

      {last === "error" ? (
        <div className="container">
          <p className="notice">{t.error.data}</p>
        </div>
      ) : null}
      <NewsletterBand
        lang={lang}
        race={last && last !== "error" ? last.data : null}
        winnerPositions={
          last && last !== "error" && recapReplay
            ? (recapReplay.data.drivers.find((d) => d.code === last.data.results[0]?.driver.code)?.positions ?? null)
            : null
        }
        next={next && next !== "error" ? next.data : null}
        form={<NewsletterForm lang={lang} back="newsletter" />}
      />
    </>
  );
}

/** 79.328 → "1:19.328", F1 notation (content.md §2). */
function lapTimeText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds - m * 60).toFixed(3).padStart(6, "0")}`;
}

function coordinates(lang: Lang, lat: number, lng: number): string {
  const fmt = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? (lang === "de" ? "O" : "E") : lang === "es" ? "O" : "W";
  return `${fmt.format(Math.abs(lat))}° ${ns} · ${fmt.format(Math.abs(lng))}° ${ew}`;
}

/**
 * Hero (NUC-01 to NUC-03) as a drawing sheet: the Grand Prix name at full scale, the countdown as a
 * dimension line measuring the gap from the previous Grand Prix to the start, the title block with the
 * circuit's details and the weekend as a ruler. The headline is not animated: it is the LCP.
 */
async function NextGrandPrix({ lang, next, previous }: { lang: Lang; next: Fetched<RaceDetail>; previous: RaceDetail | null }) {
  const t = dict(lang);
  const race = next.data;
  const tz = circuitTimeZone(race.circuit.id);
  const schedule = await api.schedule(race.season).catch(() => null);
  const total = schedule ? schedule.data.filter((r) => r.status !== "cancelled").length : null;
  const { before, word, after } = splitGpName(lang, race.name);
  const guide = CIRCUIT_GUIDES[race.circuit.id];
  const { explainer, reason } = suggestedExplainer(race.circuit.id, race.isSprintWeekend, lang);
  const from = previous?.startsAt && previous.season === race.season ? previous : null;
  const layout = await api.circuitLayout(race.circuit.id).catch(() => null);
  const title = (
    <h1 id="next-gp" className="sheet-title">
      {before ? <span className="sheet-lead">{before} </span> : null}
      <span className={`sheet-word ${wordSize(word)}`}>{word}</span>
      {after ? <span className="sheet-lead sheet-trail"> {after}</span> : null}
    </h1>
  );

  return (
    <div className={layout ? "sheet sheet-lap" : "sheet"}>
      <div className="sheet-head">
        <p className="eyebrow">{t.home.next}</p>
        <p className="sheet-index">
          <span className="visually-hidden">{t.home.round(race.round, race.season)}</span>
          <span aria-hidden="true">
            R{race.round}
            {total ? <span className="sheet-index-total">/{total}</span> : null} · {race.season}
          </span>
        </p>
      </div>

      {layout ? (
        <>
          <LapStage layout={layout.data} labels={{ slowest: t.home.lap.slowest, speed: t.home.lap.speed }}>
            {title}
          </LapStage>
        </>
      ) : (
        title
      )}

      {race.startsAt ? (
        <div className="sheet-cota">
          <p className="visually-hidden">{t.home.startsOn(formatDateTime(lang, race.startsAt, tz ?? "UTC"))}</p>
          <Countdown
            caption={t.home.until}
            startsAt={race.startsAt}
            fromIso={from?.startsAt ?? null}
            serverNow={Date.now()}
            units={t.home.units}
            startedLabel={t.home.started}
            labels={{
              from: from ? t.home.cotaFrom(formatDate(lang, from.date)) : t.home.cotaFromWeeks,
              now: t.home.cotaNow,
              to: t.home.cotaTo(formatDate(lang, race.date)),
            }}
          />
        </div>
      ) : null}

      {layout ? (
        <p className="lap-caption">
          {t.home.lap.caption(layout.data.driver.name, layout.data.season)}{" "}
          <span className="lap-caption-time">{lapTimeText(layout.data.lapTime)}</span>
        </p>
      ) : null}

      <dl className="cajetin">
        <div className="cajetin-cell cajetin-wide icon-scroll">
          <dt>
              <Icon name="pin" />
              {t.home.cajetin.circuit}
            </dt>
          <dd>
            <Link href={`/${lang}/circuits/${race.circuit.id}`}>{race.circuit.name}</Link>
            <span className="muted block">
              {race.circuit.locality}, {countryName(lang, race.circuit.country)}
            </span>
          </dd>
        </div>
        <div className="cajetin-cell icon-scroll">
          <dt>
              <Icon name="gauge" />
              {t.home.cajetin.coords}
            </dt>
          <dd className="tabular">{coordinates(lang, race.circuit.lat, race.circuit.lng)}</dd>
        </div>
        <div className="cajetin-cell icon-scroll">
          <dt>
              <Icon name="layers" />
              {t.home.cajetin.format}
            </dt>
          <dd>{race.isSprintWeekend ? t.home.cajetin.sprint : t.home.cajetin.classic}</dd>
        </div>
        {race.startsAt ? (
          <div className="cajetin-cell cajetin-wide icon-scroll">
            <dt>
              <Icon name="clock" />
              {t.home.cajetin.start}
            </dt>
            <dd>
              <LocalTime iso={race.startsAt} lang={lang} circuitTimeZone={tz} circuitLabel={t.home.circuitTime} stacked />
            </dd>
          </div>
        ) : null}
        {guide ? (
          <div className="cajetin-cell icon-scroll">
            <dt>
              <Icon name="eye" />
              {t.home.cajetin.preview}
            </dt>
            <dd>
              <Link href={`/${lang}/circuits/${race.circuit.id}#guide`}>{t.home.cajetin.previewLink}</Link>
            </dd>
          </div>
        ) : null}
        <div className={guide ? "cajetin-cell icon-scroll" : "cajetin-cell cajetin-wide icon-scroll"}>
          <dt>
              <Icon name="book" />
              {t.home.toUnderstand.replace(/:$/, "")}
            </dt>
          <dd>
            <Link href={`/${lang}/learn/${explainer.slug}`}>{explainer.title[lang]}</Link>
            <span className="muted block">{reason}</span>
          </dd>
        </div>
      </dl>

      {race.sessions.length > 0 ? (
        <div className="sheet-sessions">
          <h2 className="sheet-caption">{t.home.schedule}</h2>
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
          {/* The same times as text, for screen readers: the calendar is a drawing. */}
          <div className="visually-hidden">
            <SessionList lang={lang} sessions={race.sessions} circuitTimeZone={tz} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** End of season (NUC-07): the same sheet, with the champion at full scale and the dimension line to the next season. */
function SeasonOver({
  lang,
  drivers,
  nextSeason,
  previous,
}: {
  lang: Lang;
  drivers: Fetched<Standings<DriverStandingRow>> | null | "error";
  /** First Grand Prix of the next season, if its calendar is already published. */
  nextSeason: RaceDetail | null;
  previous: RaceDetail | null;
}) {
  const t = dict(lang);
  const standings = drivers && drivers !== "error" ? drivers.data : null;
  const leader = standings?.rows[0];
  const following = (standings?.season ?? new Date().getUTCFullYear()) + 1;
  return (
    <div className="sheet">
      <div className="sheet-head">
        <p className="eyebrow">{t.home.seasonDone(standings?.season ?? following - 1)}</p>
      </div>
      <h1 id="next-gp" className="sheet-title">
        {leader && standings ? (
          <>
            <span className="visually-hidden">{t.home.seasonOver(fullName(leader.driver), standings.season)}</span>
            <span aria-hidden="true">
              <span className="sheet-lead">{t.home.champion} </span>
              <span className={`sheet-word ${wordSize(leader.driver.familyName)}`}>{leader.driver.familyName}</span>
            </span>
          </>
        ) : (
          <span className="sheet-word sheet-word-m">{t.home.noData}</span>
        )}
      </h1>
      {nextSeason?.startsAt ? (
        <div className="sheet-cota">
          <p className="sheet-caption">{t.home.nextSeason(nextSeason.season, gpName(lang, nextSeason.name), formatDate(lang, nextSeason.date))}</p>
          <Countdown
            startsAt={nextSeason.startsAt}
            fromIso={previous?.startsAt ?? null}
            serverNow={Date.now()}
            units={t.home.units}
            startedLabel={t.home.started}
            labels={{
              from: previous ? t.home.cotaFrom(formatDate(lang, previous.date)) : t.home.cotaFromWeeks,
              now: t.home.cotaNow,
              to: t.home.cotaTo(formatDate(lang, nextSeason.date)),
            }}
          />
          <p>
            <Link href={`/${lang}/races/${nextSeason.season}`}>{t.calendar.title(nextSeason.season)}</Link>
          </p>
        </div>
      ) : nextSeason ? (
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
