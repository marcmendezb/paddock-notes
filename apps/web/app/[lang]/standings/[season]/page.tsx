import type { Metadata } from "next";
import Link from "next/link";
import { maxPointsPerRound, titleContenders, type Lang, type StandingsHistory } from "@paddock/shared";
import { PointsChart } from "@/components/charts/points-chart";
import { SERIES_COUNT, SeriesSwatch } from "@/components/charts/series";
import { SeasonPicker } from "@/components/season-picker";
import { Icon } from "@/components/icons";
import { ConstructorTower, DriverTower, ResultsHeatmap, StandingsHero } from "@/components/standings-view";
import { api } from "@/lib/api";
import { formatDate, formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang, parseSeason } from "@/lib/params";
import { favoriteSet } from "@/lib/session";

type Props = {
  params: Promise<{ lang: string; season: string }>;
  searchParams: Promise<{ round?: string; d?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  return {
    title: {
      es: `Clasificación F1 ${season}: pilotos y constructores`,
      en: `${season} F1 standings: drivers and constructors`,
      de: `F1-Wertung ${season}: Fahrer und Konstrukteure`,
    }[lang],
    description: {
      es: `Puntos, victorias y evolución del campeonato ${season} carrera a carrera.`,
      en: `Points, wins and how the ${season} championship unfolded race by race.`,
      de: `Punkte, Siege und der Verlauf der WM ${season}, Rennen für Rennen.`,
    }[lang],
    alternates: {
      canonical: `/${lang}/standings/${season}`,
      languages: { es: `/es/standings/${season}`, en: `/en/standings/${season}`, de: `/de/standings/${season}` },
    },
  };
}

export default async function StandingsPage({ params, searchParams }: Props) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const query = await searchParams;
  const t = dict(lang);

  const requestedRound = query.round && /^\d{1,2}$/.test(query.round) ? Number(query.round) : null;
  const [history, schedule, favorites] = await Promise.all([api.standingsHistory(season), api.schedule(season), favoriteSet()]);
  const [drivers, constructors] = await Promise.all(
    requestedRound
      ? [api.driverStandingsAfter(season, requestedRound), api.constructorStandingsAfter(season, requestedRound)]
      : [api.driverStandings(season), api.constructorStandings(season)],
  );

  // The chart's selection: whoever arrives in ?d= (6 at most) or, by default, the favourites (COM-10) and
  // then the top of the standings.
  const picked = [query.d ?? []].flat().filter((id) => /^[a-z0-9_-]{1,64}$/.test(id));
  const allDrivers = history?.data.drivers ?? [];
  const favoriteDrivers = new Set(
    (drivers?.data.rows ?? [])
      .filter((r) => favorites.has(`d:${r.driver.id}`) || r.constructors.some((c) => favorites.has(`c:${c.id}`)))
      .map((r) => r.driver.id),
  );
  const byDefault = [
    ...allDrivers.filter((d) => favoriteDrivers.has(d.driver.id)),
    ...allDrivers.filter((d) => !favoriteDrivers.has(d.driver.id)),
  ].map((d) => d.driver.id);
  const selected = (picked.length ? picked : byDefault).slice(0, SERIES_COUNT);

  const isCurrent = season === new Date().getUTCFullYear();
  const remaining = (schedule?.data ?? []).filter((r) => r.status === "next" || r.status === "upcoming");
  const contenders =
    isCurrent && !requestedRound && drivers
      ? titleContenders(
          season,
          drivers.data.rows.map((r) => ({ id: r.driver.id, points: r.points })),
          remaining.map((r) => ({ isSprintWeekend: r.isSprintWeekend })),
        )
      : null;
  const contenderNames = contenders
    ?.map((id) => drivers?.data.rows.find((r) => r.driver.id === id))
    .filter((r) => r !== undefined)
    .map((r) => fullName(r.driver));

  const leader = drivers?.data.rows[0] ?? null;
  const second = drivers?.data.rows[1] ?? null;
  const total = (schedule?.data ?? []).length;
  const shownRound = drivers?.data.round ?? 0;
  const isFinal = !requestedRound && total > 0 && remaining.length === 0;
  const remainingPoints = remaining.reduce((sum, r) => sum + (maxPointsPerRound(season, r.isSprintWeekend) ?? 0), 0);
  const decided = contenderNames && contenderNames.length === 1 && remaining.length > 0 ? contenderNames[0]! : null;

  const status = (
    <div className="st-status">
      {decided ? <p className="st-status-line">{t.standings2.decided(decided)}</p> : null}
      {contenderNames && contenderNames.length > 1 && remaining.length > 0 ? (
        <p className="st-status-line">{t.standings2.contenders(contenderNames.join(", "))}</p>
      ) : null}
      {isCurrent && !requestedRound && remaining.length > 0 && remainingPoints > 0 ? (
        <p className="st-status-sub">{t.header.mega.standings.left(remaining.length, remainingPoints)}</p>
      ) : null}
      {contenderNames && remaining.length > 0 ? <p className="source">{t.standings2.contendersHelp}</p> : null}
    </div>
  );

  return (
    <div className="st">
      <StandingsHero
        lang={lang}
        season={season}
        round={shownRound}
        total={total}
        leader={leader}
        second={second}
        isFinal={isFinal || Boolean(decided)}
        status={status}
        pickers={
          <>
            <SeasonPicker lang={lang} season={season} base="standings" />
            {history ? <RoundPicker lang={lang} season={season} rounds={history.data.rounds} current={requestedRound} /> : null}
          </>
        }
      />

      <div className="container stack-xl">
        <div className="st-boards">
          <section aria-labelledby="drivers" className="rv-section">
            <h2 id="drivers" className="rv-h2">
              {t.standings.drivers}
            </h2>
            {drivers ? <DriverTower lang={lang} rows={drivers.data.rows} favorites={favorites} /> : <p className="muted">{t.home.noData}</p>}
          </section>
          <section aria-labelledby="constructors" className="rv-section">
            <h2 id="constructors" className="rv-h2">
              {t.standings.constructors}
            </h2>
            {constructors ? (
              <ConstructorTower lang={lang} rows={constructors.data.rows} favorites={favorites} />
            ) : (
              <p className="muted">{t.home.noData}</p>
            )}
            <Link href={`/${lang}/standings/${season}/current-points`} className="st-recalc" data-surface="ink">
              <span className="st-recalc-kicker">
                <Icon name="layers" /> {t.standings2.recalcLine}
              </span>
              <span className="st-recalc-title">{t.recalc.link(season)}</span>
              <span className="recap-note-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </div>

        {history && history.data.rounds.length > 1 ? (
          <section aria-labelledby="evolution" className="rv-section">
            <h2 id="evolution" className="rv-h2">
              {t.standings2.evolution}
            </h2>
            <div className="st-chart">
              <DriverPicker lang={lang} season={season} history={history.data} selected={selected} round={requestedRound} />
              <PointsChart lang={lang} history={history.data} selected={selected} title={t.standings2.evolution} favorites={favoriteDrivers} />
              <details className="st-alt">
                <summary>{t.standings2.tableAlt}</summary>
                <PointsTable lang={lang} history={history.data} selected={selected} />
              </details>
            </div>
          </section>
        ) : null}

        {history ? (
          <section aria-labelledby="matrix" className="rv-section">
            <h2 id="matrix" className="rv-h2">
              {t.standings2.matrix}
            </h2>
            <ResultsHeatmap lang={lang} history={history.data} />
          </section>
        ) : null}

        {drivers?.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, drivers.updatedAt))}</p> : null}
      </div>
    </div>
  );
}

function RoundPicker({
  lang,
  season,
  rounds,
  current,
}: {
  lang: Lang;
  season: number;
  rounds: StandingsHistory["rounds"];
  current: number | null;
}) {
  const t = dict(lang);
  return (
    <form action={`/${lang}/standings/${season}`} method="get" className="season-picker">
      <label htmlFor="round">{t.standings2.afterRoundLabel}</label>
      <select id="round" name="round" defaultValue={current ?? rounds.at(-1)?.round}>
        {rounds.map((r) => (
          <option key={r.round} value={r.round}>
            {r.round}
          </option>
        ))}
      </select>
      <button type="submit">{t.calendar.go}</button>
    </form>
  );
}

/** The chart's driver picker: a GET form, it works without JavaScript. */
function DriverPicker({
  lang,
  season,
  history,
  selected,
  round,
}: {
  lang: Lang;
  season: number;
  history: StandingsHistory;
  selected: string[];
  round: number | null;
}) {
  const t = dict(lang);
  return (
    <form action={`/${lang}/standings/${season}#evolution`} method="get" className="st-picker">
      {round ? <input type="hidden" name="round" value={round} /> : null}
      <fieldset className="picker st-chips">
        <legend>{t.standings2.evolutionHelp}</legend>
        {history.drivers.slice(0, 20).map((d) => {
          const index = selected.indexOf(d.driver.id);
          return (
            <label key={d.driver.id}>
              <input type="checkbox" name="d" value={d.driver.id} defaultChecked={index >= 0} />
              {index >= 0 ? <SeriesSwatch index={index} /> : null}
              {fullName(d.driver)}
            </label>
          );
        })}
      </fieldset>
      <button type="submit" className="st-show">{t.standings2.show}</button>
    </form>
  );
}

function PointsTable({ lang, history, selected }: { lang: Lang; history: StandingsHistory; selected: string[] }) {
  const t = dict(lang);
  const rows = history.drivers.filter((d) => selected.includes(d.driver.id));
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.standings2.tableAlt}>
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">{t.standings.columns.driver}</th>
            {history.rounds.map((r) => (
              <th key={r.round} scope="col" className="num">
                {r.round}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.driver.id}>
              <th scope="row">{fullName(d.driver)}</th>
              {d.points.map((p, i) => (
                <td key={i} className="num">
                  {p === null ? "—" : formatPoints(lang, p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
