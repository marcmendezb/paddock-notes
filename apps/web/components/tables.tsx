import Link from "next/link";
import {
  countryName,
  gpName,
  type ConstructorStandingRow,
  type DriverStandingRow,
  type Lang,
  type PitStopEntry,
  type QualifyingEntry,
  type RaceResultRow,
  type RaceSummary,
} from "@paddock/shared";
import { formatDate, formatPoints, formatSigned } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { CircuitLink, DriverLink, TeamLink } from "./links";

/**
 * Data tables: semantic HTML, tabular figures and state in text, never colour alone (TRA-20, TRA-22).
 * The container is a focusable region: on narrow screens the table scrolls horizontally and must be
 * navigable with the keyboard (WCAG 2.1.1).
 * Favourites (COM-10): the row is highlighted and also carries the "Favourite" label in text.
 */

const EMPTY = new Set<string>();

function isFavorite(favorites: Set<string>, driverId: string | null, teamIds: string[]): boolean {
  return (driverId !== null && favorites.has(`d:${driverId}`)) || teamIds.some((id) => favorites.has(`c:${id}`));
}

function FavoriteTag({ lang }: { lang: Lang }) {
  return <span className="tag tag-fav">{dict(lang).favorite}</span>;
}

export function CalendarTable({ lang, races }: { lang: Lang; races: RaceSummary[] }) {
  const t = dict(lang).calendar;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={dict(lang).nav.races}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.columns.round}</th>
            <th scope="col">{t.columns.gp}</th>
            <th scope="col">{t.columns.circuit}</th>
            <th scope="col">{t.columns.date}</th>
            <th scope="col">{t.columns.winner}</th>
          </tr>
        </thead>
        <tbody>
          {races.map((r) => (
            <tr key={r.round} data-status={r.status}>
              <td className="num">{r.round}</td>
              <th scope="row">
                <Link href={`/${lang}/races/${r.season}/${r.round}`}>{gpName(lang, r.name)}</Link>
                {r.isSprintWeekend ? <span className="tag">{t.sprint}</span> : null}
                {r.status !== "completed" ? <span className="tag tag-quiet">{t.status[r.status]}</span> : null}
              </th>
              <td>
                <CircuitLink lang={lang} id={r.circuit.id} name={r.circuit.name} />
                <span className="muted block">{r.circuit.locality}, {countryName(lang, r.circuit.country)}</span>
              </td>
              <td className="tabular nowrap">{formatDate(lang, r.date)}</td>
              <td>{r.winner ? <DriverLink lang={lang} driver={r.winner} /> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsTable({
  lang,
  results,
  favorites = EMPTY,
}: {
  lang: Lang;
  results: RaceResultRow[];
  favorites?: Set<string>;
}) {
  const t = dict(lang).race;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.result}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.columns.pos}</th>
            <th scope="col">{t.columns.driver}</th>
            <th scope="col">{t.columns.team}</th>
            <th scope="col" className="num">{t.columns.grid}</th>
            <th scope="col" className="num">{t.columns.gained}</th>
            <th scope="col" className="num">{t.columns.laps}</th>
            <th scope="col">{t.columns.time}</th>
            <th scope="col" className="num">{t.columns.points}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const fav = isFavorite(favorites, r.driver.id, [r.constructor.id]);
            return (
            <tr key={`${r.driver.id}-${r.constructor.id}`} className={fav ? "is-favorite" : undefined}>
              <td className="num">{r.position !== null && /^\d+$/.test(r.positionText) ? `P${r.position}` : r.positionText}</td>
              <th scope="row">
                <DriverLink lang={lang} driver={r.driver} />
                {fav ? <FavoriteTag lang={lang} /> : null}
                {r.fastestLap?.rank === 1 ? (
                  <span className="tag tag-accent">
                    {t.fastestMark}
                    {r.fastestLap.time ? ` · ${r.fastestLap.time}` : ""}
                  </span>
                ) : null}
              </th>
              <td>
                <TeamLink lang={lang} team={r.constructor} />
              </td>
              <td className="num">{r.grid === 0 ? "PL" : (r.grid ?? "—")}</td>
              <td className="num">{r.positionsGained === null ? "—" : formatSigned(lang, r.positionsGained)}</td>
              <td className="num">{r.laps}</td>
              <td className="tabular">{r.time ?? r.status}</td>
              <td className="num">{formatPoints(lang, r.points)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DriverStandingsTable({
  lang,
  rows,
  limit,
  favorites = EMPTY,
}: {
  lang: Lang;
  rows: DriverStandingRow[];
  limit?: number;
  favorites?: Set<string>;
}) {
  const t = dict(lang).standings.columns;
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={dict(lang).standings.drivers}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.pos}</th>
            <th scope="col">{t.driver}</th>
            <th scope="col">{t.team}</th>
            <th scope="col" className="num">{t.wins}</th>
            {limit ? null : <th scope="col" className="num">{t.podiums}</th>}
            <th scope="col" className="num">{t.points}</th>
            {limit ? null : <th scope="col" className="num">{t.gap}</th>}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const fav = isFavorite(favorites, r.driver.id, r.constructors.map((c) => c.id));
            return (
            <tr key={r.driver.id} className={fav ? "is-favorite" : undefined}>
              <td className="num">{r.position ?? "—"}</td>
              <th scope="row">
                <DriverLink lang={lang} driver={r.driver} />
                {fav ? <FavoriteTag lang={lang} /> : null}
              </th>
              <td>
                {r.constructors.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? " / " : ""}
                    <TeamLink lang={lang} team={c} />
                  </span>
                ))}
              </td>
              <td className="num">{r.wins}</td>
              {limit ? null : <td className="num">{r.podiums}</td>}
              <td className="num">{formatPoints(lang, r.points)}</td>
              {limit ? null : <td className="num">{r.gapToLeader === 0 ? "—" : `−${formatPoints(lang, r.gapToLeader)}`}</td>}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ConstructorStandingsTable({
  lang,
  rows,
  limit,
  favorites = EMPTY,
}: {
  lang: Lang;
  rows: ConstructorStandingRow[];
  limit?: number;
  favorites?: Set<string>;
}) {
  const t = dict(lang).standings.columns;
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={dict(lang).standings.constructors}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.pos}</th>
            <th scope="col">{t.team}</th>
            <th scope="col" className="num">{t.wins}</th>
            <th scope="col" className="num">{t.points}</th>
            {limit ? null : <th scope="col" className="num">{t.gap}</th>}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const fav = isFavorite(favorites, null, [r.constructor.id]);
            return (
            <tr key={r.constructor.id} className={fav ? "is-favorite" : undefined}>
              <td className="num">{r.position ?? "—"}</td>
              <th scope="row">
                <TeamLink lang={lang} team={r.constructor} />
                {fav ? <FavoriteTag lang={lang} /> : null}
              </th>
              <td className="num">{r.wins}</td>
              <td className="num">{formatPoints(lang, r.points)}</td>
              {limit ? null : <td className="num">{r.gapToLeader === 0 ? "—" : `−${formatPoints(lang, r.gapToLeader)}`}</td>}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function QualifyingTable({ lang, rows }: { lang: Lang; rows: QualifyingEntry[] }) {
  const t = dict(lang);
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.race2.qualifying}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.race.columns.pos}</th>
            <th scope="col">{t.race.columns.driver}</th>
            <th scope="col">{t.race.columns.team}</th>
            <th scope="col" className="num">Q1</th>
            <th scope="col" className="num">Q2</th>
            <th scope="col" className="num">Q3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.driver.id}>
              <td className="num">{r.position ? `P${r.position}` : "—"}</td>
              <th scope="row">
                <DriverLink lang={lang} driver={r.driver} />
              </th>
              <td>
                <TeamLink lang={lang} team={r.constructor} />
              </td>
              <td className="num">{r.q1 ?? "—"}</td>
              <td className="num">{r.q2 ?? "—"}</td>
              <td className="num">{r.q3 ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PitStopsTable({ lang, rows }: { lang: Lang; rows: PitStopEntry[] }) {
  const t = dict(lang);
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.race2.pitStops}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.race2.columns.lap}</th>
            <th scope="col">{t.race.columns.driver}</th>
            <th scope="col" className="num">{t.race2.columns.stop}</th>
            <th scope="col" className="num">{t.race2.columns.duration}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.driver.id}-${r.stop}`}>
              <td className="num">{r.lap}</td>
              <th scope="row">
                <DriverLink lang={lang} driver={r.driver} />
              </th>
              <td className="num">{r.stop}</td>
              <td className="num">{r.duration} s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
