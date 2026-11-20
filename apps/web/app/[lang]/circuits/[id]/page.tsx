import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { circuitTimeZone, countryName, gpName } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { Icon } from "@/components/icons";
import { smoothClosedPath } from "@/components/race-recap";
import { RaceSubnav, type SubnavItem } from "@/components/race-subnav";
import { RaceBackdrop } from "@/components/race-view";
import { RaceCountdown } from "@/components/race-countdown";
import { GuideSpread } from "@/components/circuit-guide";
import { CircuitGlobe, isNight } from "@/components/circuit-globe";
import { CircuitLap } from "@/components/circuit-lap";
import { CornerCards, LapStats, SpeedTrace } from "@/components/circuit-telemetry";
import { LocalClock } from "@/components/local-clock";
import { TimeOffset } from "@/components/time-offset";
import { CIRCUIT_OUTLINES } from "@/content/circuit-outlines";
import { wordSize } from "@/lib/gp-title";
import { api } from "@/lib/api";
import { formatDate, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Params = { params: Promise<{ lang: string; id: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const profile = await api.circuit(p.id);
  if (!profile) notFound();
  return { lang, profile: profile.data };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, profile } = await load(params);
  const name = profile.circuit.name;
  return {
    title: { es: `${name}: ganadores y datos del circuito`, en: `${name}: winners and circuit facts`, de: `${name}: Sieger und Streckendaten` }[lang],
    description: {
      es: `Todos los Grandes Premios disputados en ${name}, año a año.`,
      en: `Every Grand Prix held at ${name}, year by year.`,
      de: `Alle Grands Prix auf ${name}, Jahr für Jahr.`,
    }[lang],
    alternates: {
      canonical: `/${lang}/circuits/${profile.circuit.id}`,
      languages: { es: `/es/circuits/${profile.circuit.id}`, en: `/en/circuits/${profile.circuit.id}`, de: `/de/circuits/${profile.circuit.id}` },
    },
  };
}

export default async function CircuitPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const { circuit, races } = profile;
  // A response cached before `facts` was added does not have them: the page renders the same, without those figures.
  const facts = profile.facts ?? { laps: null, fastestRaceLap: null };
  const place = `${circuit.locality}, ${countryName(lang, circuit.country)}`;
  const first = races.at(-1);
  // Only Grands Prix already run count, not next weekend's.
  const today = new Date().toISOString().slice(0, 10);
  const held = races.filter((r) => r.date < today);
  const [layout, schedule] = await Promise.all([
    api.circuitLayout(circuit.id).catch(() => null),
    api.schedule("current").catch(() => null),
  ]);
  const lap = layout?.data ?? null;
  // Without telemetry, the layout from bacinger/f1-circuits' GeoJSON (D-09).
  const outline = lap?.points ?? CIRCUIT_OUTLINES[circuit.id] ?? null;
  const nextHere = schedule?.data.find((r) => r.circuit.id === circuit.id && (r.status === "next" || r.status === "upcoming")) ?? null;
  const nextStart = nextHere?.sessions.find((s) => s.kind === "race")?.startsAt ?? nextHere?.startsAt ?? null;
  const guide = CIRCUIT_GUIDES[circuit.id];
  const GuideBody = guide?.body[lang];
  const nf = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 2 });
  const km = lap ? nf.format(lap.length / 1000) : "";
  const timeZone = circuitTimeZone(circuit.id);

  // Who has won here most often: drivers and teams.
  const tally = (key: (r: (typeof held)[number]) => { id: string; name: string } | null) => {
    const out = new Map<string, { id: string; name: string; n: number }>();
    for (const r of held) {
      const k = key(r);
      if (!k) continue;
      const w = out.get(k.id) ?? { ...k, n: 0 };
      w.n += 1;
      out.set(k.id, w);
    }
    return [...out.values()].sort((x, y) => y.n - x.n || x.name.localeCompare(y.name));
  };
  const drivers = tally((r) => (r.winner ? { id: r.winner.id, name: fullName(r.winner) } : null));
  const teams = tally((r) => r.constructor);
  const most = drivers[0];
  const kings = held.length >= 4 && drivers.length >= 2;

  const cv = t.circuitView;
  const items: SubnavItem[] = [
    { id: "where", label: cv.where, icon: "pin" as const },
    ...(guide && GuideBody ? [{ id: "guide", label: t.circuit.guide, icon: "book" as const }] : []),
    ...(lap ? [{ id: "lap", label: cv.lap, icon: "gauge" as const }] : []),
    { id: "winners", label: t.circuit.winners, icon: "trophy" as const },
  ];
  const heroFacts = [
    first ? { label: t.circuit.facts.first, value: String(first.season) } : null,
    held.length ? { label: cv.gps, value: String(held.length) } : null,
    most && most.n > 1 ? { label: cv.mostWins, value: most.name, sub: cv.wins(most.n) } : null,
    facts.fastestRaceLap
      ? { label: t.circuit.facts.fastest, value: facts.fastestRaceLap.time, sub: `${fullName(facts.fastestRaceLap.driver)}, ${facts.fastestRaceLap.season}` }
      : null,
    lap ? { label: cv.length, value: `${km} km`, sub: facts.laps ? `${facts.laps.laps} ${t.circuit.facts.laps.toLowerCase()}` : undefined } : null,
    lap && facts.laps ? { label: cv.raceDistance, value: `${nf.format(Math.round((lap.length * facts.laps.laps) / 100) / 10)} km` } : null,
  ].filter((f): f is { label: string; value: string; sub?: string } => f !== null);
  const night = isNight(circuit.lat, circuit.lng);
  const fmt = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const ns = circuit.lat >= 0 ? "N" : "S";
  const ew = circuit.lng >= 0 ? (lang === "de" ? "O" : "E") : lang === "es" ? "O" : "W";
  const lapClock = lap ? `${Math.floor(lap.lapTime / 60)}:${(lap.lapTime % 60).toFixed(3).padStart(6, "0")}` : "";

  return (
    <article className="rv cv">
      {outline ? <RaceBackdrop points={outline} /> : null}
      <section className="rv-hero cv-hero" data-surface="ink" aria-labelledby="circuit-title">
        <div className="container cv-hero-grid">
          <div className="rv-crumbs">
            <Breadcrumbs lang={lang} items={[{ href: `/${lang}/races`, label: t.nav.races }, { label: circuit.name }]} />
          </div>
          <div className="rv-head">
            <p className="eyebrow rv-kicker">
              <Icon name="pin" /> {place}
            </p>
            <h1 id="circuit-title" className="rv-title">
              <span className={`rv-word ${wordSize(circuit.name)}`}>{circuit.name}</span>
            </h1>
            {first && held.length ? <p className="rv-place cv-lede">{t.circuit.lede(circuit.name, place, held.length, first.season)}</p> : null}
          </div>
          {lap ? (
            <div className="cv-hero-track">
              <CircuitLap
                layout={lap}
                labels={{
                  figure: cv.replayFigure(circuit.name, lap.driver.name, lap.season),
                  play: cv.play,
                  pause: cv.pause,
                  kmh: "km/h",
                  realTime: `${cv.realTime} · ${lap.driver.code} ${lap.season}`,
                  slow: cv.slow,
                  fast: cv.fast,
                }}
              />
            </div>
          ) : outline ? (
            <figure className="cv-hero-track cv-track">
              <svg className="rv-track" viewBox={trackBox(outline)} aria-hidden="true" focusable="false">
                <path d={smoothClosedPath(outline)} className="rv-track-base" />
                <path d={smoothClosedPath(outline)} pathLength={1} className="rv-track-line" />
              </svg>
              <figcaption className="cv-track-source">{cv.outlineSource}</figcaption>
            </figure>
          ) : null}
          {heroFacts.length ? (
            <div className="cv-hero-facts">
              <dl className="cv-facts">
                {heroFacts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.value}
                      {f.sub ? <span className="cv-fact-sub">{f.sub}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              {facts.fastestRaceLap ? <p className="cv-hero-note">{t.circuit.facts.fastestNote}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <RaceSubnav label={t.raceView.onThisPage} round={cv.page} name={circuit.name} items={items} prev={null} next={null} />

      <div className="container stack-xl">
        <section aria-labelledby="where" className="rv-section">
          <h2 id="where" className="rv-h2">
            {cv.where}
          </h2>
          <div className="cv-where" data-surface="ink">
            <div className="cv-where-globe">
              <CircuitGlobe lat={circuit.lat} lng={circuit.lng} label={cv.globe(circuit.name, place)} />
            </div>
            <div className="cv-where-info">
              <p className="cv-where-place">
                <span className="cv-where-city">{circuit.locality}</span>
                <span className="cv-where-country">{countryName(lang, circuit.country)}</span>
              </p>
              <dl className="cv-where-facts">
                <div>
                  <dt>{t.home.cajetin.coords}</dt>
                  <dd className="tabular">
                    {fmt.format(Math.abs(circuit.lat))}° {ns}
                    <br />
                    {fmt.format(Math.abs(circuit.lng))}° {ew}
                  </dd>
                </div>
                {timeZone ? (
                  <div>
                    <dt>{cv.localTime}</dt>
                    <dd>
                      <LocalClock lang={lang} timeZone={timeZone} />
                      <span className="cv-where-sub">
                        <TimeOffset timeZone={timeZone} same={cv.sameTime} template={cv.offset("{h}")} />
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="cv-where-sky">
                <Icon name={night ? "moon" : "sun"} /> {night ? cv.night : cv.day}
              </p>
              {nextHere ? (
                <Link href={`/${lang}/races/${nextHere.season}/${nextHere.round}`} className="cv-next">
                  <span className="cv-next-kicker">
                    <Icon name="flag" /> {cv.nextHere}
                  </span>
                  <span className="cv-next-name">{gpName(lang, nextHere.name)}</span>
                  <span className="cv-next-date">
                    {t.home.round(nextHere.round, nextHere.season)} · {formatDate(lang, nextHere.date)}
                  </span>
                  {nextStart ? (
                    <RaceCountdown startsAt={nextStart} serverNow={Date.now()} units={t.home.board.units} live={t.home.live} label={t.home.until} />
                  ) : null}
                  <span className="cv-next-cta">{t.calendar.view.seeRace}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {guide && GuideBody ? (
          <section aria-labelledby="guide" className="rv-section">
            <h2 id="guide" className="rv-h2">
              {t.circuit.guide}
            </h2>
            <GuideSpread Body={GuideBody} updated={t.circuit.guideUpdated(formatDate(lang, guide.updated))} />
          </section>
        ) : null}
      </div>

      {lap ? (
        <section aria-labelledby="lap" className="cv-band" data-surface="ink">
          <div className="container cv-band-inner">
            <header className="cv-band-head">
              <h2 id="lap" className="rv-h2">
                {cv.lap}
              </h2>
              <p className="cv-band-lede">{cv.lapLede(lap.driver.name, lap.season, lapClock, km)}</p>
            </header>
            <LapStats lang={lang} t={lap} />
            <div className="cv-trace-block">
              <h3 className="cv-h3">{cv.trace}</h3>
              <SpeedTrace lang={lang} t={lap} name={circuit.name} />
              <p className="source">{t.circuit.layoutCaption(lap.season, km)}</p>
            </div>
            {lap.corners.length ? (
              <div className="cv-corners-block">
                <h3 className="cv-h3">{cv.corners}</h3>
                <p className="cv-band-help">{t.circuit.brakingHelp}</p>
                <CornerCards lang={lang} t={lap} circuitId={circuit.id} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="container stack-xl cv-after">
        <section aria-labelledby="winners" className="rv-section">
          <h2 id="winners" className="rv-h2">
            {t.circuit.winners}
          </h2>
          {kings ? (
            <div className="cv-kings">
              <h3 className="cv-h3">{cv.kings}</h3>
              <Ranking title={cv.drivers} rows={drivers.slice(0, 5)} wins={cv.wins} />
              <Ranking title={cv.teams} rows={teams.slice(0, 5)} wins={cv.wins} />
            </div>
          ) : null}
          <h3 className="cv-h3">{cv.roll}</h3>
          <ol className="cv-roll">
            {held.map((r) => (
              <li key={`${r.season}-${r.round}`}>
                <Link href={`/${lang}/races/${r.season}/${r.round}`} className="cv-roll-link">
                  <span className="cv-roll-year tabular">{r.season}</span>
                  <span className="cv-roll-name">{r.winner ? fullName(r.winner) : "—"}</span>
                  <span className="cv-roll-team">{r.constructor ? r.constructor.name : gpName(lang, r.name)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

/** The most successful here, with a bar proportional to the first (the number is always in text). */
function Ranking({ title, rows, wins }: { title: string; rows: { id: string; name: string; n: number }[]; wins: (n: number) => string }) {
  const max = rows[0]?.n ?? 1;
  return (
    <div className="cv-rank">
      <h4 className="cv-rank-title">{title}</h4>
      <ol>
        {rows.map((r, i) => (
          <li key={r.id} className={i === 0 ? "is-first" : undefined}>
            <span className="cv-rank-name">{r.name}</span>
            <span className="cv-rank-n tabular">{wins(r.n)}</span>
            <svg className="cv-rank-bar" width="100%" height="8" aria-hidden="true" focusable="false">
              <rect x="0" y="0" width="100%" height="8" className="cv-rank-rail" />
              <rect x="0" y="0" width={`${((r.n / max) * 100).toFixed(1)}%`} height="8" className="cv-rank-fill" />
            </svg>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The layout's box with a margin, for the viewBox. */
function trackBox(points: [number, number][]): string {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
}
