import Link from "next/link";
import type { ReactNode } from "react";
import { countryName, gpName, gpShortName, type Lang, type RaceSummary } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { Icon, SESSION_ICON } from "./icons";
import { smoothClosedPath } from "./race-recap";
import { VisitorTime } from "./visitor-time";
import { localeOf } from "@/lib/format";

/**
 * The season calendar told as a year of racing (NUC-04):
 * - A black header with the season as a straight from March to December: each Grand Prix on its real date
 *   (finished in white, the next in lilac, the rest in outline; sprints with their mark), today's line and
 *   figures computed from the calendar.
 * - The next race highlighted, with its layout and the sessions in the visitor's time.
 * - Race by race, grouped by month: the weekend's dates, the circuit and the winner or status.
 * All on the server: positions go as SVG attributes (D-04).
 */

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);
const short = gpShortName;
const locale = localeOf;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "6–8 Mar" (or "30 Apr–2 May"): from the first day with sessions to race day. */
function weekend(lang: Lang, r: RaceSummary): string {
  const days = r.sessions.map((s) => s.date).filter(Boolean).sort();
  const first = days[0] ?? r.date;
  const fmt = (iso: string, withMonth: boolean) =>
    new Intl.DateTimeFormat(locale(lang), withMonth ? { day: "numeric", month: "short", timeZone: "UTC" } : { day: "numeric", timeZone: "UTC" })
      .format(utc(iso))
      .replace(/\./g, "");
  if (first === r.date) return fmt(r.date, true);
  const sameMonth = first.slice(0, 7) === r.date.slice(0, 7);
  return `${fmt(first, !sameMonth)}–${fmt(r.date, true)}`;
}

function Timeline({ lang, races, now }: { lang: Lang; races: RaceSummary[]; now: number }) {
  const t = dict(lang).calendar.view;
  const W = 1200;
  const H = 230;
  const Y = 150;
  const pad = 36;
  const start = utc(races[0]!.date) - 10 * DAY;
  const end = utc(races.at(-1)!.date) + 10 * DAY;
  const x = (ms: number) => pad + ((ms - start) / (end - start)) * (W - 2 * pad);
  const months: { ms: number; label: string }[] = [];
  const d = new Date(start);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() < end) {
    months.push({ ms: d.getTime(), label: new Intl.DateTimeFormat(locale(lang), { month: "short", timeZone: "UTC" }).format(d).replace(/\./g, "") });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const today = now >= start && now <= end ? x(now) : null;

  return (
    <svg className="tl" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t.timeline}>
      <line x1={pad} x2={W - pad} y1={Y} y2={Y} className="tl-rail" />
      {today !== null ? <line x1={pad} x2={today} y1={Y} y2={Y} className="tl-done" /> : null}
      {months.map((m) => (
        <g key={m.ms} className="tl-month">
          <line x1={x(m.ms)} x2={x(m.ms)} y1={Y + 10} y2={Y + 18} />
          <text x={x(m.ms)} y={Y + 36} textAnchor="middle">
            {m.label}
          </text>
        </g>
      ))}
      {today !== null ? (
        <g className="tl-today">
          <line x1={today} x2={today} y1={Y - 8} y2={Y + 44} />
          <text x={today} y={Y + 58} textAnchor="middle">
            {t.today}
          </text>
        </g>
      ) : null}
      {races.map((r) => {
        const cx = x(utc(r.date));
        const state = r.status === "completed" ? "done" : r.status === "next" ? "next" : r.status === "cancelled" ? "cancelled" : "upcoming";
        return (
          <Link
            key={r.round}
            href={`/${lang}/races/${r.season}/${r.round}`}
            className={`tl-race is-${state}`}
            aria-label={`${gpName(lang, r.name)} · ${dict(lang).calendar.status[r.status]}`}
          >
            <text x={cx} y={Y - 22} transform={`rotate(-58 ${cx} ${Y - 22})`} className="tl-label">
              {short(lang, r.name)}
            </text>
            <g transform={`translate(${cx} ${Y}) skewX(-12)`}>
              <rect x={-6} y={-6} width={12} height={12} className="tl-mark" />
              {r.isSprintWeekend ? <rect x={-2.5} y={-17} width={5} height={5} className="tl-sprint" /> : null}
            </g>
            <rect x={cx - 14} y={Y - 140} width={28} height={150} className="tl-hit" />
          </Link>
        );
      })}
    </svg>
  );
}

export function SeasonHero({
  lang,
  season,
  races,
  picker,
}: {
  lang: Lang;
  season: number;
  races: RaceSummary[];
  /** Season picker (the page's own component). */
  picker: ReactNode;
}) {
  const t = dict(lang);
  const v = t.calendar.view;
  const now = Date.now();
  const active = races.filter((r) => r.status !== "cancelled");
  const done = active.filter((r) => r.status === "completed");
  const next = active.find((r) => r.status === "next");
  const sprints = active.filter((r) => r.isSprintWeekend).length;
  const wins = new Map<string, { name: string; n: number }>();
  for (const r of done) {
    if (!r.winner) continue;
    const w = wins.get(r.winner.id) ?? { name: r.winner.familyName, n: 0 };
    w.n += 1;
    wins.set(r.winner.id, w);
  }
  const most = [...wins.values()].sort((a, b) => b.n - a.n)[0];
  const daysTo = next ? Math.max(0, Math.ceil((utc(next.date) - now) / DAY)) : null;

  return (
    <section className="sv-hero" data-surface="ink" aria-labelledby="season-title">
      <div className="container sv-hero-grid">
        <div className="sv-head">
          <p className="eyebrow sv-kicker icon-scroll">
            <Icon name="flag" /> {v.kicker(active.length, sprints)}
          </p>
          <h1 id="season-title" className="sv-title">
            {t.calendar.title(season)}
          </h1>
          <div className="sv-tools">
            {picker}
            <a href={`/${lang}/races/${season}/calendar.ics`} download className="sv-ics">
              <Icon name="calendar" /> {t.home.addToCalendar}
            </a>
          </div>
        </div>
        {active.length ? <Timeline lang={lang} races={races.filter((r) => r.status !== "cancelled")} now={now} /> : null}
        <dl className="sv-stats">
          <div>
            <dt>{v.progressLabel}</dt>
            <dd>
              {done.length}
              <span className="sv-of">/{active.length}</span>
            </dd>
          </div>
          {next ? (
            <div className="sv-stat-next">
              <dt>{v.next}</dt>
              <dd>
                {short(lang, next.name)} <span className="sv-sub">{daysTo !== null ? v.inDays(daysTo) : ""}</span>
              </dd>
            </div>
          ) : null}
          {most ? (
            <div>
              <dt>{v.mostWins}</dt>
              <dd>
                {most.name} <span className="sv-sub">{v.wins(most.n)}</span>
              </dd>
            </div>
          ) : null}
          {done.length ? (
            <div>
              <dt>{v.winners}</dt>
              <dd>{wins.size}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}

export function NextRaceFeature({ lang, race, layout }: { lang: Lang; race: RaceSummary; layout: [number, number][] | null }) {
  const t = dict(lang);
  const v = t.calendar.view;
  const sessions = race.sessions.filter((s): s is typeof s & { startsAt: string } => s.startsAt !== null);
  let outline: { d: string; box: string } | null = null;
  if (layout && layout.length > 2) {
    const xs = layout.map((p) => p[0]);
    const ys = layout.map((p) => p[1]);
    const pad = 40;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    outline = { d: smoothClosedPath(layout), box: `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}` };
  }
  return (
    <section className={outline ? "sv-next" : "sv-next sv-next-solo"} aria-labelledby="sv-next-title">
      <div className="sv-next-copy">
        <p className="eyebrow">
          {v.next} · {t.home.round(race.round, race.season)}
        </p>
        <h2 id="sv-next-title" className="sv-next-title">
          <Link href={`/${lang}/races/${race.season}/${race.round}`}>{gpName(lang, race.name)}</Link>
        </h2>
        <p className="sv-next-meta">
          <Icon name="pin" /> {race.circuit.name} · {race.circuit.locality}, {countryName(lang, race.circuit.country)} · {weekend(lang, race)}
        </p>
        {sessions.length ? (
          <ol className="sv-sessions">
            {sessions.map((s) => (
              <li key={s.kind} className={s.kind === "race" ? "is-race" : undefined}>
                <Icon name={SESSION_ICON[s.kind]} />
                <span>{t.sessions[s.kind]}</span>
                <VisitorTime iso={s.startsAt} lang={lang} />
              </li>
            ))}
          </ol>
        ) : null}
        <Link href={`/${lang}/races/${race.season}/${race.round}`} className="sv-next-cta">
          {v.seeRace}
        </Link>
      </div>
      {outline ? (
        <svg className="sv-next-track" viewBox={outline.box} aria-hidden="true" focusable="false">
          <path d={outline.d} className="sv-next-track-base" />
          <path d={outline.d} pathLength={1} className="sv-next-track-line" />
        </svg>
      ) : null}
    </section>
  );
}

export function SeasonRounds({ lang, races }: { lang: Lang; races: RaceSummary[] }) {
  const t = dict(lang);
  const v = t.calendar.view;
  const groups = new Map<string, RaceSummary[]>();
  for (const r of races) groups.set(r.date.slice(0, 7), [...(groups.get(r.date.slice(0, 7)) ?? []), r]);

  return (
    <section className="sv-rounds" aria-labelledby="sv-rounds-title">
      <h2 id="sv-rounds-title" className="sv-section-title">
        {v.byRound}
      </h2>
      {[...groups.entries()].map(([month, list]) => (
        <div key={month} className="sv-month">
          <h3 className="sv-month-name">
            {cap(new Intl.DateTimeFormat(locale(lang), { month: "long", timeZone: "UTC" }).format(utc(`${month}-15`)))}
          </h3>
          <ol className="sv-list">
            {list.map((r) => {
              const state = r.status === "completed" ? "done" : r.status === "next" ? "next" : r.status === "cancelled" ? "cancelled" : "upcoming";
              return (
                <li key={r.round} className={`sv-row is-${state}`}>
                  <Link href={`/${lang}/races/${r.season}/${r.round}`} className="sv-row-link">
                    <span className="sv-round tabular">{String(r.round).padStart(2, "0")}</span>
                    <span className="sv-gp">
                      <span className="sv-gp-name">{short(lang, r.name)}</span>
                      <span className="sv-gp-circuit">
                        {r.circuit.name} · {r.circuit.locality}, {countryName(lang, r.circuit.country)}
                      </span>
                    </span>
                    <span className="sv-when tabular">
                      {weekend(lang, r)}
                      {r.isSprintWeekend ? (
                        <span className="sv-sprint">
                          <Icon name="bolt" /> {t.calendar.sprint}
                        </span>
                      ) : null}
                    </span>
                    <span className="sv-state">
                      {state === "done" && r.winner ? (
                        <>
                          <Icon name="trophy" /> {r.winner.givenName} {r.winner.familyName}
                        </>
                      ) : state === "next" ? (
                        <>
                          <span className="sv-dot" aria-hidden="true" /> {v.next}
                        </>
                      ) : (
                        t.calendar.status[r.status]
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
