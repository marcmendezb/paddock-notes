import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { REPO_URL } from "@/lib/site";
import { LangSwitch } from "./lang-switch";
import { gpName, gpShortName, isSessionLive, NOTES } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { FooterMark } from "./footer-mark";
import { Icon } from "./icons";
import { AnalysisPanel, ComparePanel, LearnPanel, StandingsPanel } from "./header-panels";
import { RacesPanel } from "./races-panel";
import { MobileMenu, NavLinks, type NavItem } from "./nav-links";
import { TimingStrip, type TickerItem, type TickerRace } from "./timing-strip";
import { HeaderSearch } from "./header-search";
import { SearchShortcut } from "./search-shortcut";

/**
 * The mark (brand.md §2) inline, with the exact geometry of the brand SVG (a single-weight "pn" ligature
 * slanted 12° and the lime square), so its pieces can animate on hover: the square laps the ligature like
 * a circuit, without deforming the mark.
 */
const LOGO_PATH = "M6 41V17A7 7 0 0 1 20 17V33M20 23A7 7 0 0 1 6 23M20 17A7 7 0 0 1 34 17V33";

/**
 * The footer lap: a light runs the ligature like a circuit, without a single corner: it leaves the dot on
 * a curve, climbs the last stem, crosses the arch of the "n", circles the bowl of the "p" below and above,
 * runs down the middle stem and returns to the dot on a curve. Every join is tangent. The lap takes 60 %
 * of the cycle, with gentle acceleration and braking; then the tail gathers in and the dot breathes.
 */
const LAP_PATH =
  "M42 30C37 30 34 31 34 26V17A7 7 0 0 0 20 17V23A7 7 0 0 1 6 23V17A7 7 0 0 1 20 17V27C20 33 36 30 42 30";
const LAP_DUR = "7s";
const LAP_TIMES = "0; 0.6; 0.7; 1";
const LAP_SPLINES = "0.6 0 0.4 1; 0.3 0 0.3 1; 0 0 1 1";

function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 4.5 48 39" width="56" height="46" aria-hidden="true" focusable="false">
      <g transform="translate(7.2 0) skewX(-12)">
        <path className="logo-stroke" d={LOGO_PATH} />
        <path className="logo-trace" d={LOGO_PATH} pathLength={1} />
        <rect className="logo-dot" x="39" y="27" width="6" height="6" />
      </g>
    </svg>
  );
}

/** Each of the header's data promises fails silently: the navigation renders even if the API does not answer. */
const safe = <T,>(p: Promise<T>) => p.catch(() => null);

/**
 * Pit-wall header (TRA-01), always black (data-surface="ink", brand.md §3):
 * - the timing strip with the next session or the live one;
 * - the sticky bar with the sections numbered like grid slots, the current one marked with the logo's
 *   square and, on hover, a panel with real data for each section;
 * - on mobile, a full-screen menu that works without JavaScript.
 */
export async function SiteHeader({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const [next, standings, analyses, thisWeek, last, teams, schedule] = await Promise.all([
    safe(api.nextRace()),
    safe(api.driverStandings("current")),
    safe(api.analysisList()),
    safe(api.thisWeek()),
    safe(api.lastRace()),
    safe(api.constructorStandings("current")),
    safe(api.schedule("current")),
  ]);
  const race = next?.data ?? null;
  const top = standings?.data.rows.slice(0, 3) ?? [];
  const lastAnalysis = analyses?.data[0] ?? null;
  const memory = thisWeek?.data.find((e) => e.winner) ?? null;
  const note = [...NOTES].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const h = t.header;

  const items: NavItem[] = [
    {
      href: "/races",
      label: t.nav.races,
      teaser: h.teasers.races,
      panel:
        race || last ? (
          <RacesPanel
            lang={lang}
            next={race}
            last={last?.data ?? null}
            schedule={schedule?.data ?? []}
            lastAnalysed={Boolean(
              last && analyses?.data.some((a) => a.season === last.data.season && a.round === last.data.round),
            )}
          />
        ) : undefined,
      wide: true,
    },
    {
      href: "/standings",
      label: t.nav.standings,
      teaser: h.teasers.standings,
      panel: standings ? (
        <StandingsPanel lang={lang} drivers={standings.data} teams={teams?.data ?? null} schedule={schedule?.data ?? []} />
      ) : undefined,
      wide: true,
    },
    {
      href: "/analysis",
      label: t.nav.analysis,
      teaser: h.teasers.analysis,
      panel: analyses?.data.length ? <AnalysisPanel lang={lang} analyses={analyses.data} next={race} /> : undefined,
      wide: true,
    },
    {
      href: "/compare",
      label: t.nav.compare,
      teaser: h.teasers.compare,
      panel: standings ? <ComparePanel lang={lang} drivers={standings.data} /> : undefined,
      wide: true,
    },
    {
      href: "/learn",
      label: t.nav.learn,
      teaser: h.teasers.learn,
      panel: <LearnPanel lang={lang} />,
      wide: true,
    },
  ];

  // What comes after the next session, in the timing strip: only data we have.
  const leader = top[0];
  const second = top[1];
  const teamLeader = teams?.data.rows[0];
  const teamSecond = teams?.data.rows[1];
  const lastResults = last?.data.results ?? [];
  const winner = lastResults.find((r) => r.position === 1);
  const fastest = lastResults.find((r) => r.fastestLap?.rank === 1);
  const climber = [...lastResults].filter((r) => (r.positionsGained ?? 0) > 0).sort((a, b) => b.positionsGained! - a.positionsGained!)[0];
  const lastHref = last ? `/${lang}/races/${last.data.season}/${last.data.round}` : "";
  const lastGp = last ? gpName(lang, last.data.name) : "";
  const pts = (n: number) => `${formatPoints(lang, n)} pts`;
  const ticker: TickerItem[] = [
    ...(race && CIRCUIT_GUIDES[race.circuit.id]
      ? [{ key: "preview", label: h.strip.preview, text: race.circuit.name, href: `/${lang}/circuits/${race.circuit.id}#guide` }]
      : []),
    ...(leader
      ? [{ key: "leader", label: h.strip.leader, text: `${fullName(leader.driver)} · ${pts(leader.points)}${second ? ` · +${formatPoints(lang, leader.points - second.points)}` : ""}`, href: `/${lang}/standings` }]
      : []),
    ...(teamLeader
      ? [{ key: "team", label: h.strip.team, text: `${teamLeader.constructor.name} · ${pts(teamLeader.points)}${teamSecond ? ` · +${formatPoints(lang, teamLeader.points - teamSecond.points)}` : ""}`, href: `/${lang}/standings#constructors` }]
      : []),
    ...(winner ? [{ key: "winner", label: h.strip.winner, text: `${fullName(winner.driver)} · ${lastGp}`, href: lastHref }] : []),
    ...(fastest?.fastestLap?.time
      ? [{ key: "fastest", label: h.strip.fastest, text: `${fullName(fastest.driver)} · ${fastest.fastestLap.time}`, href: lastHref }]
      : []),
    ...(climber
      ? [{ key: "climb", label: h.strip.climb, text: `${fullName(climber.driver)} · +${climber.positionsGained} · ${lastGp}`, href: lastHref }]
      : []),
    ...(lastAnalysis
      ? [{ key: "analysis", label: h.strip.analysis, text: `${gpName(lang, lastAnalysis.name)} ${lastAnalysis.season}`, href: `/${lang}/analysis/${lastAnalysis.season}/${lastAnalysis.round}` }]
      : []),
    ...(note ? [{ key: "note", label: h.strip.note, text: note.title[lang], href: `/${lang}/notes/${note.slug}` }] : []),
    ...(memory?.winner
      ? [{ key: "memory", label: h.strip.memory(memory.season), text: `${fullName(memory.winner)} · ${gpName(lang, memory.name)}`, href: `/${lang}/races/${memory.season}/${memory.round}` }]
      : []),
  ];

  // Timing strip events: the next Grand Prix with all its sessions and the rest of the season.
  const upcoming: TickerRace[] = [
    ...(race
      ? [{ href: `/${lang}/races/${race.season}/${race.round}`, gp: gpName(lang, race.name), startsAt: race.startsAt, sessions: race.sessions }]
      : []),
    ...(schedule?.data ?? [])
      .filter((r) => race && r.round > race.round && r.status !== "cancelled")
      .slice(0, 3)
      .map((r) => ({ href: `/${lang}/races/${r.season}/${r.round}`, gp: gpName(lang, r.name), startsAt: r.startsAt, sessions: [] })),
  ];

  const tools = (
    <>
      {/* Live search (TRA-03): suggestions while typing; without JavaScript, a GET form to /search. */}
      <HeaderSearch
        lang={lang}
        labels={{
          search: t.nav.search,
          placeholder: t.search.label,
          groups: t.search.box.groups,
          loading: t.search.box.loading,
          none: t.search.box.none("{q}"),
          all: t.search.box.all("{q}"),
          clear: t.search.box.clear,
          one: t.search.box.count(1),
          many: t.search.box.count(2).replace("2", "{n}"),
        }}
      />
      <Link href={`/${lang}/account`} className="header-tool">
        <Icon name="user" />
        <span className="header-tool-label">{t.account.nav}</span>
      </Link>
      <LangSwitch current={lang} label={t.language} />
    </>
  );

  return (
    <header id="top" className="site-header" data-surface="ink">
      <TimingStrip
        races={upcoming}
        items={ticker}
        lang={lang}
        serverNow={Date.now()}
        labels={{
          next: h.strip.next,
          live: h.strip.live,
          later: h.strip.later,
          inText: h.strip.inText,
          sessions: t.sessions,
          units: t.home.board.units,
        }}
      />
      <div className="header-bar">
        <div className="container header-row">
          {/* The mark alone, at a generous size: the name goes in the accessible label (brand.md §2). */}
          <Link href={`/${lang}`} className="logo" aria-label={`${t.name}, ${t.tagline}`}>
            <LogoMark />
          </Link>
          <nav aria-label={h.main} className="header-nav">
            <NavLinks lang={lang} items={items} />
          </nav>
          <div className="header-tools">{tools}</div>
          <MobileMenu lang={lang} items={items} labels={{ open: h.menu, close: h.close }} footer={tools} />
        </div>
      </div>
      <SearchShortcut lang={lang} />
    </header>
  );
}

type RoundState = "done" | "live" | "next" | "upcoming" | "cancelled";

/**
 * Footer: every page's finish line, always black (brand.md §3). On the left, the full mark in large size,
 * tilting towards the cursor, with the lime dot endlessly lapping the ligature like a circuit, with a lilac
 * trail and a ripple on arrival; below it, the tagline and the newsletter. On the right, the season race by race (finished in white, the next
 * in lilac, live in lime) and, below it, the navigation. Legal text, on one small line at the bottom.
 */
export async function SiteFooter({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const f = t.footer;
  const schedule = await safe(api.schedule("current"));
  const now = Date.now();
  const rounds = (schedule?.data ?? []).map((r) => {
    const state: RoundState =
      r.status === "completed"
        ? "done"
        : r.status === "cancelled"
          ? "cancelled"
          : r.status === "next"
            ? r.sessions.some((s) => isSessionLive(s, now))
              ? "live"
              : "next"
            : "upcoming";
    // Nombre corto: «Gran Premio de Australia» → «Australia»; «Australian Grand Prix» → «Australian».
    const short = gpShortName(lang, r.name);
    return { key: r.round, href: `/${lang}/races/${r.season}/${r.round}`, short, state };
  });
  const season = schedule?.data[0]?.season ?? null;
  const done = rounds.filter((r) => r.state === "done").length;
  const total = rounds.filter((r) => r.state !== "cancelled").length;

  const sections: [string, string][] = [
    ["/races", t.nav.races],
    ["/standings", t.nav.standings],
    ["/analysis", t.nav.analysis],
    ["/compare", t.nav.compare],
    ["/learn", t.nav.learn],
  ];

  return (
    <footer className="site-footer" data-surface="ink">
      <div className="container ft">
        {/* Left: the full mark, with a lilac glint at 12° running round it non-stop, and the tagline. */}
        <div className="ft-brand">
          {/* Like the header logo: it leads to the home page. */}
          <Link href={`/${lang}`} className="ft-mark-link" aria-label={`${t.name}, ${t.tagline}`}>
          <FooterMark>
            <svg className="ft-mark" viewBox="0 4.5 48 39" aria-hidden="true" focusable="false">
              <defs>
                {/* The trail only shows inside the letters. */}
                <mask id="ft-letters" maskUnits="userSpaceOnUse" x="-10" y="0" width="70" height="50">
                  <path d={LOGO_PATH} className="ft-mask-path" />
                </mask>
              </defs>
              <g transform="translate(7.2 0) skewX(-12)">
                <path className="ft-mark-base" d={LOGO_PATH} />
                {/* A lilac trail behind the light, its tail fading over three layers. */}
                <g mask="url(#ft-letters)" className="ft-mark-fx">
                  <path className="ft-mark-trail ft-trail-3" d={LAP_PATH} pathLength={1} strokeDasharray="0.32 2">
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0.32; -0.68; -1; -1"
                      keyTimes={LAP_TIMES}
                      calcMode="spline"
                      keySplines={LAP_SPLINES}
                      dur={LAP_DUR}
                      repeatCount="indefinite"
                    />
                  </path>
                  <path className="ft-mark-trail ft-trail-2" d={LAP_PATH} pathLength={1} strokeDasharray="0.18 2">
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0.18; -0.82; -1; -1"
                      keyTimes={LAP_TIMES}
                      calcMode="spline"
                      keySplines={LAP_SPLINES}
                      dur={LAP_DUR}
                      repeatCount="indefinite"
                    />
                  </path>
                  <path className="ft-mark-trail ft-trail-1" d={LAP_PATH} pathLength={1} strokeDasharray="0.08 2">
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0.08; -0.92; -1; -1"
                      keyTimes={LAP_TIMES}
                      calcMode="spline"
                      keySplines={LAP_SPLINES}
                      dur={LAP_DUR}
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
                {/* The light that laps: a crisp lilac circle that leaves the dot and comes back to it. */}
                <g className="ft-mark-fx">
                  <circle r="2.4" className="ft-light">
                    <animateMotion path={LAP_PATH} keyPoints="0; 1; 1; 1" keyTimes={LAP_TIMES} calcMode="spline" keySplines={LAP_SPLINES} dur={LAP_DUR} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0; 0" keyTimes="0; 0.06; 0.54; 0.6; 1" dur={LAP_DUR} repeatCount="indefinite" />
                  </circle>
                </g>
                {/* The dot does not move (the brand does not allow rounding or deforming it): it breathes when the light returns. */}
                <g transform="translate(42 30)">
                  <rect className="ft-mark-dot" x="-3" y="-3" width="6" height="6">
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      values="1; 1; 1.16; 1; 1"
                      keyTimes="0; 0.58; 0.66; 0.8; 1"
                      calcMode="spline"
                      keySplines="0 0 1 1; 0.16 1 0.3 1; 0.45 0 0.55 1; 0 0 1 1"
                      dur={LAP_DUR}
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>
              </g>
            </svg>
          </FooterMark>
          </Link>
          <p className="ft-claim">{t.tagline}</p>
          <Link href={`/${lang}/newsletter`} className="ft-cta">
            <Icon name="book" /> {t.newsletter.lede}
          </Link>
        </div>

        <div className="ft-side">
          {rounds.length && season !== null ? (
            <section className="ft-season" aria-labelledby="ft-season">
              <div className="ft-season-head">
                <h2 id="ft-season" className="ft-heading">
                  <Icon name="flag" /> {f.season(season)}
                </h2>
                <p className="ft-season-meta">{f.progress(done, total)}</p>
              </div>
              <ol className="ft-rounds">
                {rounds.map((r) => (
                  <li key={r.key} className={`ft-round is-${r.state}`}>
                    <Link href={r.href} prefetch={false}>
                      <span className="ft-dot" aria-hidden="true" />
                      <span className="ft-round-name">{r.short}</span>
                      {r.state === "next" || r.state === "live" ? (
                        <span className="ft-round-state">{f.states[r.state]}</span>
                      ) : (
                        <span className="visually-hidden"> · {f.states[r.state]}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <nav className="ft-cols" aria-label={f.navLabel}>
            <div>
              <h2 className="ft-heading">{f.sections}</h2>
              <ul className="ft-list">
                {sections.map(([href, label]) => (
                  <li key={href}>
                    <Link href={`/${lang}${href}`}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="ft-heading">{f.project}</h2>
              <ul className="ft-list">
                <li>
                  <Link href={`/${lang}/about`}>{f.about}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/newsletter`}>{f.newsletter}</Link>
                </li>
                <li>
                  <a href={REPO_URL} rel="noopener noreferrer">
                    {f.code}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="ft-heading">{f.legalTitle}</h2>
              <ul className="ft-list">
                <li>
                  <Link href={`/${lang}/privacy`}>{f.privacy}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/legal`}>{f.legal}</Link>
                </li>
                <li>
                  <Link href={`/${lang}/accessibility`}>{f.accessibility}</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="ft-base">
          {/* The legal minimum, small: the non-affiliation notice and data attribution (CC BY-NC-SA). */}
          <p className="ft-legal">
            {f.disclaimer} {f.data}
          </p>
          <span className="ft-base-end">
            <LangSwitch current={lang} label={t.language} up />
            <Link href={`/${lang}`} className="ft-lockup-link">
              <img src="/brand/paddock-notes-horizontal-sobre-negro.svg" alt={t.name} width="158" height="28" className="ft-lockup" />
            </Link>
            {/* In the flow, last in the row: absolutely positioned it sat on top of the lockup. */}
            <a href="#top" className="ft-top">
              <span aria-hidden="true">↑</span>
              <span className="visually-hidden">{f.top}</span>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

