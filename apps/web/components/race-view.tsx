import Link from "next/link";
import type { ReactNode } from "react";
import type { ToolName } from "@paddock/analysis";
import {
  countryName,
  gpName,
  gpShortName,
  isSessionLive,
  sessionDurationMs,
  type Lang,
  type RaceDetail,
  type RaceNavigation,
} from "@paddock/shared";
import { formatDate, fullName } from "@/lib/format";
import { splitGpName, wordSize } from "@/lib/gp-title";
import { dict } from "@/lib/i18n";
import { TOOL_ORDER } from "@/lib/tools";
import { Icon, SESSION_ICON, type IconName } from "./icons";
import { CircuitLink } from "./links";
import { RaceCountdown } from "./race-countdown";
import { smoothClosedPath } from "./race-recap";
import { VisitorTime } from "./visitor-time";

/**
 * Template for each Grand Prix page (NUC-05), the same for every race: today's, the upcoming ones and those
 * from 1950.
 * - Black header: the Grand Prix name with its key word at full scale, the circuit and its layout if there
 *   is telemetry; below, the podium (if it has been run) or the countdown and the times (if not).
 * - Summary: one sentence and the key figures (pole, fastest lap, comeback, time).
 * - A sticky sub-navigation (race-subnav.tsx) to jump to each section, the analysis tools as cards and,
 * at the end, the
 *   previous and next race and the same Grand Prix in other years.
 */

const TOOL_ICON: Record<ToolName, IconName> = { strategy: "layers", pace: "gauge", telemetry: "chart", sectors: "stopwatch", replay: "flag" };

export function RaceHero({
  lang,
  race,
  outline,
  breadcrumbs,
}: {
  lang: Lang;
  race: RaceDetail;
  outline: [number, number][] | null;
  breadcrumbs: ReactNode;
}) {
  const t = dict(lang);
  const v = t.raceView;
  const { before, word, after } = splitGpName(lang, race.name);
  const podium = race.results.slice(0, 3);
  const done = podium.length === 3;
  const sessions = race.sessions.filter((s): s is typeof s & { startsAt: string } => s.startsAt !== null);
  const now = Date.now();
  const raceStart = sessions.find((s) => s.kind === "race")?.startsAt ?? null;
  const nextKind = sessions.find((s) => Date.parse(s.startsAt) > now)?.kind;
  const stateOf = (s: (typeof sessions)[number]) =>
    isSessionLive(s, now) ? "live" : Date.parse(s.startsAt) + sessionDurationMs(s.kind) <= now ? "done" : s.kind === nextKind ? "next" : "upcoming";

  let track: { d: string; box: string } | null = null;
  if (outline && outline.length > 2) {
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    const pad = 40;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    track = { d: smoothClosedPath(outline), box: `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}` };
  }

  return (
    <section className="rv-hero" data-surface="ink" aria-labelledby="race-title">
      <div className="container rv-hero-grid">
        <div className="rv-crumbs">{breadcrumbs}</div>
        <div className="rv-head">
          <p className="eyebrow rv-kicker">
            <Icon name="flag" /> {t.home.round(race.round, race.season)} · <span className="tabular">{formatDate(lang, race.date)}</span>
            {race.isSprintWeekend ? (
              <span className="rv-tag">
                <Icon name="bolt" /> {t.calendar.sprint}
              </span>
            ) : null}
          </p>
          <h1 id="race-title" className="rv-title">
            {before ? <span className="rv-lead">{before} </span> : null}
            <span className={`rv-word ${wordSize(word)}`}>{word}</span>
            {after ? <span className="rv-lead"> {after}</span> : null}
          </h1>
          <p className="rv-place">
            <Icon name="pin" /> <CircuitLink lang={lang} id={race.circuit.id} name={race.circuit.name} />
            <span className="rv-place-sub">
              {race.circuit.locality}, {countryName(lang, race.circuit.country)}
            </span>
          </p>
        </div>
        {track ? (
          <svg className="rv-track" viewBox={track.box} aria-hidden="true" focusable="false">
            <path d={track.d} className="rv-track-base" />
            <path d={track.d} pathLength={1} className="rv-track-line" />
          </svg>
        ) : null}

        {done ? (
          <ol className="rv-podium" aria-label={v.podium}>
            {podium.map((r, i) => (
              <li key={r.driver.id} className={`rv-step rv-step-${i + 1}`}>
                <span className="rv-step-pos">P{i + 1}</span>
                <Link href={`/${lang}/drivers/${r.driver.id}`} className="rv-step-name">
                  {i === 0 ? (
                    <>
                      <span className="rv-step-given">{r.driver.givenName}</span> {r.driver.familyName}
                    </>
                  ) : (
                    fullName(r.driver)
                  )}
                </Link>
                <span className="rv-step-meta">
                  {r.constructor.name}
                  {r.time ? <span className="tabular"> · {r.time}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rv-upcoming">
            {raceStart ? (
              <RaceCountdown startsAt={raceStart} serverNow={now} units={t.home.board.units} live={t.home.live} label={t.home.until} />
            ) : (
              <p className="rv-count-label">{formatDate(lang, race.date)}</p>
            )}
            {sessions.length ? (
              <ol className="rv-sessions" aria-label={t.race.sessions}>
                {sessions.map((s) => {
                  const state = stateOf(s);
                  return (
                    <li key={s.kind} className={`is-${state}${s.kind === "race" ? " is-race" : ""}`}>
                      <Icon name={SESSION_ICON[s.kind]} />
                      <span>{t.sessions[s.kind]}</span>
                      <span className="rv-session-when">
                        {state === "done" ? (
                          t.home.board.done
                        ) : state === "live" ? (
                          t.home.board.live
                        ) : (
                          <VisitorTime iso={s.startsAt} lang={lang} />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

/** The race's key figures, each with its pictogram. Only those we have. */
export function RaceFacts({
  lang,
  race,
  pole,
  weather,
}: {
  lang: Lang;
  race: RaceDetail;
  pole: { name: string; time: string | null } | null;
  weather: { value: string; sub?: string } | null;
}) {
  const v = dict(lang).raceView;
  const fastest = race.results.find((r) => r.fastestLap?.rank === 1);
  const climber = [...race.results].filter((r) => (r.positionsGained ?? 0) > 0).sort((a, b) => b.positionsGained! - a.positionsGained!)[0];
  const facts: { icon: IconName; label: string; value: string; sub?: string }[] = [];
  if (pole) facts.push({ icon: "stopwatch", label: v.pole, value: pole.name, sub: pole.time ?? undefined });
  if (fastest?.fastestLap?.time) facts.push({ icon: "gauge", label: v.fastest, value: fastest.driver.familyName, sub: fastest.fastestLap.time });
  if (climber) facts.push({ icon: "chart", label: v.climb, value: `+${climber.positionsGained}`, sub: climber.driver.familyName });
  if (weather) facts.push({ icon: "eye", label: v.weather, value: weather.value, sub: weather.sub });
  if (!facts.length) return null;
  return (
    <dl className="rv-facts icon-scroll">
      {facts.map((f) => (
        <div key={f.label}>
          <dt>
            <Icon name={f.icon} /> {f.label}
          </dt>
          <dd>
            {f.value}
            {f.sub ? <span className="rv-fact-sub tabular">{f.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The race's analysis tools, as cards with the question each one answers. */
export function RaceTools({ lang, season, round, tools }: { lang: Lang; season: number; round: number; tools: string[] }) {
  const t = dict(lang);
  return (
    <ul className="rv-tools">
      {TOOL_ORDER.filter((tool) => tools.includes(tool)).map((tool) => (
        <li key={tool}>
          <Link href={`/${lang}/analysis/${season}/${round}/${tool}`} className="rv-tool">
            <Icon name={TOOL_ICON[tool]} />
            <span className="rv-tool-name">{t.analysis.tools[tool].name}</span>
            <span className="rv-tool-q">{t.analysis.tools[tool].q}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The previous and next race, as two cards, and the same Grand Prix in other years. */
export function RaceNav({ lang, nav, name }: { lang: Lang; nav: RaceNavigation; name: string }) {
  const t = dict(lang);
  const card = (dir: "prev" | "next", r: NonNullable<RaceNavigation["previous"]>) => (
    <Link href={`/${lang}/races/${r.season}/${r.round}`} className={`rv-nav-card rv-nav-${dir}`}>
      <span className="rv-nav-kicker">
        {dir === "prev" ? "← " : ""}
        {dir === "prev" ? t.race2.previous : t.race2.next}
        {dir === "next" ? " →" : ""}
      </span>
      <span className="rv-nav-name">{gpShortName(lang, r.name)}</span>
      <span className="rv-nav-meta">{t.home.round(r.round, r.season)}</span>
    </Link>
  );
  return (
    <nav className="rv-nav" aria-label={{ es: "Otras carreras", en: "Other races", de: "Weitere Rennen" }[lang]}>
      <div className="rv-nav-cards">
        {nav.previous ? card("prev", nav.previous) : <span />}
        {nav.next ? card("next", nav.next) : <span />}
      </div>
      {nav.otherYears.length > 0 ? (
        <div className="rv-years">
          <h2 className="rv-years-title">{t.race2.otherYears(gpName(lang, name))}</h2>
          <ul>
            {nav.otherYears.slice(0, 40).map((o) => (
              <li key={o.season}>
                <Link href={`/${lang}/races/${o.season}/${o.round}`} className="tabular">
                  {o.season}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

/**
 * The page background: the circuit layout, huge and faint, fixed behind the content. As you scroll down
 * the page, a line runs along it (animation-timeline: scroll): reading the race is doing a lap.
 */
export function RaceBackdrop({ points }: { points: [number, number][] }) {
  if (points.length < 3) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const d = smoothClosedPath(points);
  return (
    <svg
      className="rv-backdrop"
      viewBox={`${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} className="rv-backdrop-base" />
      <path d={d} pathLength={1} className="rv-backdrop-lap" />
    </svg>
  );
}

/** The preview: the circuit guide (if there is one) and the explainer that best fits this Grand Prix. */
export function RacePreview({
  lang,
  circuitId,
  circuitName,
  hasGuide,
  explainer,
}: {
  lang: Lang;
  circuitId: string;
  circuitName: string;
  hasGuide: boolean;
  explainer: { slug: string; title: string; reason: string };
}) {
  const v = dict(lang).raceView;
  return (
    <ul className="rv-preview">
      {hasGuide ? (
        <li>
          <Link href={`/${lang}/circuits/${circuitId}#guide`} className="rv-preview-card" data-surface="ink">
            <Icon name="pin" />
            <span className="rv-preview-kicker">{v.previewGuideKicker}</span>
            <span className="rv-preview-title">{v.previewGuide(circuitName)}</span>
            <span className="rv-preview-line">{v.previewGuideLine}</span>
          </Link>
        </li>
      ) : null}
      <li>
        <Link href={`/${lang}/learn/${explainer.slug}`} className="rv-preview-card">
          <Icon name="book" />
          <span className="rv-preview-kicker">{v.previewExplainerKicker}</span>
          <span className="rv-preview-title">{explainer.title}</span>
          <span className="rv-preview-line">{explainer.reason}</span>
        </Link>
      </li>
    </ul>
  );
}

/** Winners of this Grand Prix in recent years, most recent first. */
export function RecentWinners({
  lang,
  rows,
}: {
  lang: Lang;
  rows: { season: number; round: number; winner: string; driverId: string; team: string }[];
}) {
  return (
    <ol className="rv-winners">
      {rows.map((r) => (
        <li key={r.season}>
          <Link href={`/${lang}/races/${r.season}/${r.round}`} className="rv-winner">
            <span className="rv-winner-year tabular">{r.season}</span>
            <span className="rv-winner-name">{r.winner}</span>
            <span className="rv-winner-team">{r.team}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
