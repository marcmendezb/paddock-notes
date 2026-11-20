import Link from "next/link";
import {
  gpName,
  gpShortName,
  isSessionLive,
  noteFor,
  sessionDurationMs,
  type Lang,
  type RaceDetail,
  type RaceSummary,
} from "@paddock/shared";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { dict } from "@/lib/i18n";
import { Icon, SESSION_ICON } from "./icons";
import { VisitorTime } from "./visitor-time";
import { localeOf } from "@/lib/format";
import { RECORDS_PUBLIC } from "@/lib/records";

const shortName = gpShortName;

/** "8 Nov": no year, the panel already says it. */
const dayMonth = (lang: Lang, iso: string) =>
  new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso.slice(0, 10)}T12:00:00Z`))
    .replace(/\./g, "");

type SessionState = "done" | "live" | "next" | "upcoming";

/**
 * The "Races" panel in the header (TRA-01): everything people look for about a weekend without leaving the
 * page they are on.
 * - The next Grand Prix with its sessions in the visitor's time (done, live in lime, the next in lilac)
 *   and the links people use: the race page, the circuit guide and the .ics calendar.
 * - The season around today: the last two with their winner, the next one and those coming up.
 * - The last race: the podium and its links (results, analysis and note).
 * - A row of shortcuts.
 */
export function RacesPanel({
  lang,
  next,
  last,
  schedule,
  lastAnalysed,
}: {
  lang: Lang;
  next: RaceSummary | null;
  last: RaceDetail | null;
  schedule: RaceSummary[];
  lastAnalysed: boolean;
}) {
  const t = dict(lang);
  const p = t.header.races;
  const now = Date.now();
  const season = next?.season ?? last?.season ?? schedule[0]?.season ?? null;

  const sessions = (next?.sessions ?? []).filter((s): s is typeof s & { startsAt: string } => s.startsAt !== null);
  const nextKind = sessions.find((s) => Date.parse(s.startsAt) > now)?.kind;
  const stateOf = (s: (typeof sessions)[number]): SessionState =>
    isSessionLive(s, now)
      ? "live"
      : Date.parse(s.startsAt) + sessionDurationMs(s.kind) <= now
        ? "done"
        : s.kind === nextKind
          ? "next"
          : "upcoming";

  const active = schedule.filter((r) => r.status !== "cancelled");
  const nextIndex = active.findIndex((r) => r.status === "next");
  const around = nextIndex >= 0 ? active.slice(Math.max(0, nextIndex - 2), nextIndex + 4) : active.slice(-6);
  const note = last ? noteFor(last.season, last.round) : null;
  const guide = next ? CIRCUIT_GUIDES[next.circuit.id] : undefined;

  return (
    <div className="mega">
      {next ? (
        <section className="mega-col mega-next" aria-label={p.next}>
          <p className="panel-kicker">
            {p.next} · {t.home.round(next.round, next.season)}
          </p>
          <Link href={`/${lang}/races/${next.season}/${next.round}`} className="panel-title">
            {gpName(lang, next.name)}
          </Link>
          <p className="panel-meta">
            <Icon name="pin" /> {next.circuit.name} · {dayMonth(lang, next.date)}
          </p>
          {sessions.length ? (
            <ol className="mega-sessions">
              {sessions.map((s) => {
                const state = stateOf(s);
                return (
                  <li key={s.kind} className={`is-${state}`}>
                    <Icon name={SESSION_ICON[s.kind]} />
                    <span className="mega-session-name">{t.sessions[s.kind]}</span>
                    <span className="mega-session-when">
                      {state === "live" ? p.live : state === "done" ? p.done : <VisitorTime iso={s.startsAt} lang={lang} />}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          <p className="mega-hint">{p.yourTime}</p>
          <ul className="mega-links">
            <li>
              <Link href={`/${lang}/races/${next.season}/${next.round}`}><span>{p.raceCard}</span></Link>
            </li>
            {guide ? (
              <li>
                <Link href={`/${lang}/circuits/${next.circuit.id}`}><span>{p.preview}</span></Link>
              </li>
            ) : null}
            <li>
              <a href={`/${lang}/races/${next.season}/calendar.ics`} download>
                <span>{p.ics}</span>
              </a>
            </li>
          </ul>
        </section>
      ) : null}

      {around.length && season !== null ? (
        <section className="mega-col mega-season" aria-label={t.calendar.title(season)}>
          <p className="panel-kicker">{t.calendar.title(season)}</p>
          <ol className="mega-rounds">
            {around.map((r) => {
              const state = r.status === "completed" ? "done" : r.status === "next" ? "next" : "upcoming";
              return (
                <li key={r.round} className={`is-${state}`}>
                  <Link href={`/${lang}/races/${r.season}/${r.round}`}>
                    <span className="mega-dot" aria-hidden="true" />
                    <span className="mega-round-name">{shortName(lang, r.name)}</span>
                    <span className="mega-round-meta tabular">
                      {r.status === "completed" && r.winner ? (r.winner.code ?? r.winner.familyName) : dayMonth(lang, r.date)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link href={`/${lang}/races/${season}`} className="panel-more">
            {p.fullCalendar}
          </Link>
        </section>
      ) : null}

      {last ? (
        <section className="mega-col mega-last" aria-label={p.last}>
          <p className="panel-kicker">
            {p.last} · {shortName(lang, last.name)}
          </p>
          <ol className="panel-rank">
            {last.results.slice(0, 3).map((r, i) => (
              <li key={r.driver.id}>
                <span className="panel-pos">{i + 1}</span>
                <Link href={`/${lang}/drivers/${r.driver.id}`}>{r.driver.familyName}</Link>
                <span className="mega-team">{r.constructor.name}</span>
              </li>
            ))}
          </ol>
          <ul className="mega-links">
            <li>
              <Link href={`/${lang}/races/${last.season}/${last.round}`}><span>{p.results}</span></Link>
            </li>
            {lastAnalysed ? (
              <li>
                <Link href={`/${lang}/analysis/${last.season}/${last.round}`}><span>{p.analysis}</span></Link>
              </li>
            ) : null}
            {note ? (
              <li>
                <Link href={`/${lang}/notes/${note.slug}`}><span>{p.note}</span></Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <ul className="mega-quick">
        {season !== null ? (
          <li>
            <Link href={`/${lang}/races/${season}`}>
              <Icon name="calendar" /> {t.calendar.title(season)}
            </Link>
          </li>
        ) : null}
        <li>
          <Link href={`/${lang}/races`}>
            <Icon name="layers" /> {p.allSeasons}
          </Link>
        </li>
        {RECORDS_PUBLIC ? (
          <li>
            <Link href={`/${lang}/records`}>
              <Icon name="trophy" /> {p.records}
            </Link>
          </li>
        ) : null}
        <li>
          <Link href={`/${lang}/compare`}>
            <Icon name="user" /> {p.compare}
          </Link>
        </li>
      </ul>
    </div>
  );
}
