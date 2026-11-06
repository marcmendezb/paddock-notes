import type { Metadata } from "next";
import Link from "next/link";
import { titleContenders, type Lang, type StandingsHistory } from "@paddock/shared";
import { PointsChart } from "@/components/charts/points-chart";
import { SERIES_COUNT, SeriesSwatch } from "@/components/charts/series";
import { SeasonPicker } from "@/components/season-picker";
import { ConstructorStandingsTable, DriverStandingsTable } from "@/components/tables";
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
    title:
      lang === "es" ? `Clasificación F1 ${season}: pilotos y constructores` : `${season} F1 standings: drivers and constructors`,
    description:
      lang === "es"
        ? `Puntos, victorias y evolución del campeonato ${season} carrera a carrera.`
        : `Points, wins and how the ${season} championship unfolded race by race.`,
    alternates: {
      canonical: `/${lang}/standings/${season}`,
      languages: { es: `/es/standings/${season}`, en: `/en/standings/${season}` },
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

  // Selección del gráfico: los que lleguen en ?d= (máximo 6) o, por defecto, los favoritos (COM-10) y
  // después los primeros de la clasificación.
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

  return (
    <div className="container stack-xl">
      <div className="page-head">
        <div className="stack-s">
          <h1>{t.standings.title(season)}</h1>
          {drivers ? <p className="muted">{t.standings.afterRound(drivers.data.round)}</p> : null}
        </div>
        <SeasonPicker lang={lang} season={season} base="standings" />
      </div>

      {contenderNames && contenderNames.length > 1 && remaining.length > 0 ? (
        <div className="stack-s">
          <p className="lede">{t.standings2.contenders(contenderNames.join(", "))}</p>
          <p className="source">{t.standings2.contendersHelp}</p>
        </div>
      ) : null}

      {history ? <RoundPicker lang={lang} season={season} rounds={history.data.rounds} current={requestedRound} /> : null}

      <div className="split">
        <section aria-labelledby="drivers" className="stack">
          <h2 id="drivers">{t.standings.drivers}</h2>
          {drivers ? <DriverStandingsTable lang={lang} rows={drivers.data.rows} favorites={favorites} /> : <p className="muted">{t.home.noData}</p>}
        </section>
        <section aria-labelledby="constructors" className="stack">
          <h2 id="constructors">{t.standings.constructors}</h2>
          {constructors ? (
            <ConstructorStandingsTable lang={lang} rows={constructors.data.rows} favorites={favorites} />
          ) : (
            <p className="muted">{t.home.noData}</p>
          )}
        </section>
      </div>

      {history && history.data.rounds.length > 1 ? (
        <section aria-labelledby="evolution" className="stack">
          <h2 id="evolution">{t.standings2.evolution}</h2>
          <DriverPicker lang={lang} season={season} history={history.data} selected={selected} round={requestedRound} />
          <PointsChart lang={lang} history={history.data} selected={selected} title={t.standings2.evolution} favorites={favoriteDrivers} />
          <details>
            <summary>{t.standings2.tableAlt}</summary>
            <PointsTable lang={lang} history={history.data} selected={selected} />
          </details>
        </section>
      ) : null}

      {history ? (
        <section aria-labelledby="matrix" className="stack">
          <h2 id="matrix">{t.standings2.matrix}</h2>
          <ResultsMatrix lang={lang} history={history.data} />
        </section>
      ) : null}

      <p>
        <Link href={`/${lang}/standings/${season}/current-points`}>{t.recalc.link(season)}</Link>
      </p>

      {drivers?.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, drivers.updatedAt))}</p> : null}
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

/** Selector de pilotos del gráfico: formulario GET, funciona sin JavaScript. */
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
    <form action={`/${lang}/standings/${season}#evolution`} method="get" className="stack-s">
      {round ? <input type="hidden" name="round" value={round} /> : null}
      <fieldset className="picker">
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
      <button type="submit">{t.standings2.show}</button>
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

/** Matriz piloto × carrera con el resultado en texto (NUC-34). */
function ResultsMatrix({ lang, history }: { lang: Lang; history: StandingsHistory }) {
  const t = dict(lang);
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.standings2.matrix}>
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">{t.standings.columns.driver}</th>
            {history.rounds.map((r) => (
              <th key={r.round} scope="col" title={r.name}>
                {r.round}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.drivers.map((d) => (
            <tr key={d.driver.id}>
              <th scope="row">{fullName(d.driver)}</th>
              {d.results.map((r, i) => (
                <td key={i} className={r === "1" ? "win-cell" : r === "2" || r === "3" ? "podium-cell" : undefined}>
                  {r ?? "·"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
