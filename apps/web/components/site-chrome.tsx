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
import { AnalysisPanel, HistoryPanel, LearnPanel, StandingsPanel } from "./header-panels";
import { RacesPanel } from "./races-panel";
import { MobileMenu, NavLinks, type NavItem } from "./nav-links";
import { TimingStrip, type TickerItem, type TickerRace } from "./timing-strip";
import { SearchShortcut } from "./search-shortcut";

/**
 * El símbolo (marca.md §2) en línea, con la geometría exacta del SVG de la marca (ligadura «pn» de un solo
 * grosor inclinada 12° y el cuadrado lima), para poder animar sus piezas al pasar por encima: el cuadrado
 * da la vuelta a la ligadura como a un circuito, sin deformar el símbolo.
 */
const LOGO_PATH = "M6 41V17A7 7 0 0 1 20 17V33M20 23A7 7 0 0 1 6 23M20 17A7 7 0 0 1 34 17V33";

/**
 * La vuelta del pie: una luz recorre la ligadura como un circuito, sin una sola esquina: sale del punto en
 * curva, sube por el último palo, cruza el arco de la «n», rodea el ojo de la «p» por abajo y por arriba,
 * baja por el palo central y vuelve al punto en curva. Todas las uniones son tangentes. La vuelta ocupa el
 * 60 % del ciclo, con aceleración y frenada suaves; después la cola se recoge y el punto respira.
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

/** Cada promesa de datos de la cabecera falla en silencio: la navegación sale aunque la API no responda. */
const safe = <T,>(p: Promise<T>) => p.catch(() => null);

/**
 * Cabecera de muro de boxes (TRA-01), siempre en negro (data-surface="ink", marca.md §3):
 * - la tira de cronometraje con la próxima sesión o la que está en directo;
 * - la barra fija con las secciones numeradas como casillas de parrilla, la actual marcada con el cuadrado
 *   del logo y, al pasar por encima, un panel con datos reales de cada sección;
 * - en móvil, un menú a pantalla completa que funciona sin JavaScript.
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
      href: "/history",
      label: t.nav.history,
      teaser: h.teasers.history,
      panel: <HistoryPanel lang={lang} events={thisWeek?.data ?? []} />,
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

  // Lo que pasa detrás de la próxima sesión, en el cronometraje: solo datos que tenemos.
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

  // Eventos del cronometraje: el próximo GP con todas sus sesiones y los siguientes de la temporada.
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
      <Link href={`/${lang}/search`} className="header-tool">
        <Icon name="search" />
        <span className="header-tool-label">{t.nav.search}</span>
        <kbd className="header-kbd" aria-hidden="true">
          /
        </kbd>
      </Link>
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
          {/* Solo el símbolo, a buen tamaño: el nombre va en la etiqueta accesible (marca.md §2). */}
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
 * Pie de página: la línea de meta de cada página, siempre en negro (marca.md §3). A la izquierda, el
 * símbolo entero en grande, que se inclina hacia el cursor y en el que el punto lima da vueltas sin parar a
 * la ligadura como a un circuito, con estela lila y una onda al llegar; debajo, el eslogan y la newsletter. A la derecha, la temporada carrera a carrera (terminadas en blanco, la siguiente
 * en lila, en directo en lima) y, debajo, la navegación. Lo legal, en una línea pequeña al pie.
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
    ["/history", t.nav.history],
    ["/learn", t.nav.learn],
  ];

  return (
    <footer className="site-footer" data-surface="ink">
      <div className="container ft">
        {/* Izquierda: el símbolo entero, con un brillo lila a 12° que lo recorre sin parar, y el eslogan. */}
        <div className="ft-brand">
          <FooterMark>
            <svg className="ft-mark" viewBox="0 4.5 48 39" aria-hidden="true" focusable="false">
              <defs>
                {/* La estela solo se ve dentro de las letras. */}
                <mask id="ft-letters" maskUnits="userSpaceOnUse" x="-10" y="0" width="70" height="50">
                  <path d={LOGO_PATH} className="ft-mask-path" />
                </mask>
              </defs>
              <g transform="translate(7.2 0) skewX(-12)">
                <path className="ft-mark-base" d={LOGO_PATH} />
                {/* Estela lila detrás de la luz, con la cola desvanecida en tres capas. */}
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
                {/* La luz que da la vuelta: un círculo lila nítido que sale del punto y vuelve a él. */}
                <g className="ft-mark-fx">
                  <circle r="2.4" className="ft-light">
                    <animateMotion path={LAP_PATH} keyPoints="0; 1; 1; 1" keyTimes={LAP_TIMES} calcMode="spline" keySplines={LAP_SPLINES} dur={LAP_DUR} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0; 0" keyTimes="0; 0.06; 0.54; 0.6; 1" dur={LAP_DUR} repeatCount="indefinite" />
                  </circle>
                </g>
                {/* El punto no se mueve (la marca no permite redondearlo ni deformarlo): respira al volver la luz. */}
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
          {/* Lo mínimo legal, en pequeño: aviso de no afiliación y atribución de los datos (CC BY-NC-SA). */}
          <p className="ft-legal">
            {f.disclaimer} {f.data}
          </p>
          <span className="ft-base-end">
            <LangSwitch current={lang} label={t.language} up />
            <img src="/brand/paddock-notes-horizontal-sobre-negro.svg" alt={t.name} width="158" height="28" className="ft-lockup" />
          </span>
        </div>
      </div>
      <a href="#top" className="ft-top">
        <span aria-hidden="true">↑</span>
        <span className="visually-hidden">{f.top}</span>
      </a>
    </footer>
  );
}

/** Aviso de datos antiguos (TRA-32). */
export function StaleNotice({ lang, updatedAt }: { lang: Lang; updatedAt: string | null }) {
  const hours = updatedAt ? Math.max(1, Math.round((Date.now() - Date.parse(updatedAt)) / 3_600_000)) : null;
  return (
    <p className="notice" role="status">
      {hours === null ? dict(lang).error.data : dict(lang).stale(hours)}
    </p>
  );
}
