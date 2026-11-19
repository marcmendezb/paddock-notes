import Link from "next/link";
import {
  EXPLAINERS,
  gpName,
  gpShortName,
  maxPointsPerRound,
  NOTES,
  titleContenders,
  type ConstructorStandingRow,
  type DriverStandingRow,
  type HistoryEvent,
  type Lang,
  type RaceSummary,
  type Standings,
} from "@paddock/shared";
import { formatPoints, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { TOOL_ICON, TOOL_ORDER } from "@/lib/tools";
import { Icon, type IconName } from "./icons";

/**
 * Paneles anchos de la cabecera (TRA-01), con la misma forma que el de «Carreras»: tres columnas con datos
 * reales y una fila de accesos rápidos. Cada sección enseña lo que hay dentro y deja ir directo a ello.
 */

const short = gpShortName;

const dayMonth = (lang: Lang, iso: string) =>
  new Intl.DateTimeFormat(localeOf(lang), { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso.slice(0, 10)}T12:00:00Z`))
    .replace(/\./g, "");

/** Barra de puntos en porcentaje del líder (atributo SVG: sin estilos en línea, D-04). */
function Bar({ value, max, lead }: { value: number; max: number; lead: boolean }) {
  return (
    <svg className={lead ? "mega-bar is-lead" : "mega-bar"} viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="100" height="4" className="mega-bar-rail" />
      <rect width={Math.max(1, (value / Math.max(1, max)) * 100).toFixed(1)} height="4" className="mega-bar-fill" />
    </svg>
  );
}

/** Enlace con título y una línea que dice qué hay dentro. */
function Described({ href, icon, name, line }: { href: string; icon: IconName; name: string; line: string }) {
  return (
    <li>
      <Link href={href} className="mega-described">
        <Icon name={icon} />
        <span>
          <span className="mega-described-name">{name}</span>
          <span className="mega-described-line">{line}</span>
        </span>
      </Link>
    </li>
  );
}

function Quick({ items }: { items: { href: string; icon: IconName; label: string }[] }) {
  return (
    <ul className="mega-quick">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href}>
            <Icon name={i.icon} /> {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StandingsPanel({
  lang,
  drivers,
  teams,
  schedule,
}: {
  lang: Lang;
  drivers: Standings<DriverStandingRow>;
  teams: Standings<ConstructorStandingRow> | null;
  schedule: RaceSummary[];
}) {
  const t = dict(lang);
  const m = t.header.mega;
  const f = t.home.fight;
  const season = drivers.season;
  const remaining = schedule.filter((r) => r.status === "next" || r.status === "upcoming");
  const contenders = titleContenders(
    season,
    drivers.rows.map((r) => ({ id: r.driver.id, points: r.points })),
    remaining.map((r) => ({ isSprintWeekend: r.isSprintWeekend })),
  );
  const names = (contenders ?? []).map((id) => drivers.rows.find((r) => r.driver.id === id)?.driver.familyName).filter((n): n is string => Boolean(n));
  const headline =
    names.length === 1 ? f.champion_(names[0]!, season) : names.length === 2 ? f.duel(names[0]!, names[1]!) : names.length > 2 ? f.open(names.length) : f.title;
  const left = remaining.reduce((sum, r) => sum + (maxPointsPerRound(season, r.isSprintWeekend) ?? 0), 0);
  const top = drivers.rows.slice(0, 5);
  const lead = top[0]?.points ?? 0;
  const topTeams = teams?.rows.slice(0, 3) ?? [];

  return (
    <div className="mega">
      <section className="mega-col" aria-label={f.drivers}>
        <p className="panel-kicker">{f.kicker(season, drivers.round)}</p>
        <Link href={`/${lang}/standings`} className="panel-title panel-title-small">
          {headline}
        </Link>
        {remaining.length ? <p className="panel-meta">{m.standings.left(remaining.length, left)}</p> : null}
        <ol className="mega-table">
          {top.map((r, i) => (
            <li key={r.driver.id}>
              <Link href={`/${lang}/drivers/${r.driver.id}`}>
                <span className="mega-table-pos">{r.position}</span>
                <span className="mega-table-name">{r.driver.familyName}</span>
                <span className="mega-table-value tabular">{formatPoints(lang, r.points)}</span>
                <Bar value={r.points} max={lead} lead={i === 0} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mega-col" aria-label={f.teams}>
        <p className="panel-kicker">{f.teams}</p>
        <ol className="mega-table">
          {topTeams.map((r, i) => (
            <li key={r.constructor.id}>
              <Link href={`/${lang}/constructors/${r.constructor.id}`}>
                <span className="mega-table-pos">{r.position}</span>
                <span className="mega-table-name">{r.constructor.name}</span>
                <span className="mega-table-value tabular">{formatPoints(lang, r.points)}</span>
                <Bar value={r.points} max={topTeams[0]?.points ?? 1} lead={i === 0} />
              </Link>
            </li>
          ))}
        </ol>
        <Link href={`/${lang}/standings`} className="panel-more">
          {t.header.panel.fullStandings}
        </Link>
      </section>

      <section className="mega-col" aria-label={m.tools}>
        <p className="panel-kicker">{m.tools}</p>
        <ul className="mega-list">
          <Described href={`/${lang}/simulator`} icon="gauge" name={m.standings.simulator} line={m.standings.simulatorLine} />
          <Described href={`/${lang}/standings/${season}/current-points`} icon="layers" name={m.standings.current} line={m.standings.currentLine} />
          <Described href={`/${lang}/compare`} icon="user" name={t.history.compare} line={m.standings.compareLine} />
        </ul>
      </section>

      <Quick
        items={[
          { href: `/${lang}/standings`, icon: "chart", label: t.standings.title(season) },
          { href: `/${lang}/standings#constructors`, icon: "wrench", label: f.teams },
          { href: `/${lang}/history`, icon: "calendar", label: t.history.seasons },
        ]}
      />
    </div>
  );
}

const READ_CHARTS = ["undercut-overcut", "tyre-degradation", "telemetry", "delta", "dirty-air"];

export function AnalysisPanel({
  lang,
  analyses,
  next,
}: {
  lang: Lang;
  analyses: { season: number; round: number; name: string; date: string; tools: string[] }[];
  /** El próximo Gran Premio: su análisis es el siguiente que se publicará. */
  next: RaceSummary | null;
}) {
  const t = dict(lang);
  const m = t.header.mega;
  const latest = analyses[0]!;
  const base = `/${lang}/analysis/${latest.season}/${latest.round}`;
  const explainers = READ_CHARTS.map((slug) => EXPLAINERS.find((e) => e.slug === slug)).filter((e) => e !== undefined);

  return (
    <div className="mega">
      <section className="mega-col" aria-label={t.header.panel.lastAnalysis}>
        <p className="panel-kicker">
          {t.header.panel.lastAnalysis} · {dayMonth(lang, latest.date)}
        </p>
        <Link href={base} className="panel-title panel-title-small">
          {gpName(lang, latest.name)} {latest.season}
        </Link>
        <ul className="mega-list">
          {TOOL_ORDER.filter((tool) => latest.tools.includes(tool)).map((tool) => (
            <Described key={tool} href={`${base}/${tool}`} icon={TOOL_ICON[tool]} name={t.analysis.tools[tool].name} line={t.analysis.tools[tool].q} />
          ))}
        </ul>
      </section>

      <section className="mega-col" aria-label={m.analysis.recent}>
        <p className="panel-kicker">{m.analysis.recent}</p>
        <ul className="mega-list">
          {analyses.slice(1, 5).map((a) => (
            <Described
              key={`${a.season}-${a.round}`}
              href={`/${lang}/analysis/${a.season}/${a.round}`}
              icon="chart"
              name={`${short(lang, a.name)} ${a.season}`}
              line={`${m.analysis.tools(a.tools.length)} · ${dayMonth(lang, a.date)}`}
            />
          ))}
        </ul>
        {next ? (
          <div className="mega-upcoming">
            <span className="mega-described-name">
              {m.analysis.upcoming}: {short(lang, next.name)}
            </span>
            <span className="mega-described-line">{m.analysis.upcomingLine(dayMonth(lang, next.date))}</span>
          </div>
        ) : null}
        <Link href={`/${lang}/analysis`} className="panel-more">
          {m.analysis.all}
        </Link>
      </section>

      <section className="mega-col" aria-label={m.analysis.read}>
        <p className="panel-kicker">{m.analysis.read}</p>
        <ul className="mega-links">
          {explainers.map((e) => (
            <li key={e.slug}>
              <Link href={`/${lang}/learn/${e.slug}`}><span>{e.title[lang]}</span></Link>
            </li>
          ))}
        </ul>
      </section>

      <Quick
        items={[
          { href: `/${lang}/analysis`, icon: "chart", label: m.analysis.all },
          { href: `${base}/strategy`, icon: "layers", label: t.analysis.tools.strategy.name },
          { href: `${base}/telemetry`, icon: "gauge", label: t.analysis.tools.telemetry.name },
        ]}
      />
    </div>
  );
}

export function HistoryPanel({ lang, events }: { lang: Lang; events: HistoryEvent[] }) {
  const t = dict(lang);
  const m = t.header.mega;
  const list = events.filter((e) => e.winner).slice(0, 5);

  return (
    <div className="mega">
      <section className="mega-col" aria-label={t.history.thisWeek}>
        <p className="panel-kicker">{t.history.thisWeek}</p>
        {list.length ? (
          <ol className="mega-events">
            {list.map((e) => (
              <li key={`${e.season}-${e.round}`}>
                <Link href={`/${lang}/races/${e.season}/${e.round}`}>
                  <span className="mega-event-year tabular">{e.season}</span>
                  <span>
                    <span className="mega-described-name">{fullName(e.winner!)}</span>
                    <span className="mega-described-line">{gpName(lang, e.name)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="panel-meta">{t.history.noEvents}</p>
        )}
      </section>

      <section className="mega-col" aria-label={m.history.explore}>
        <p className="panel-kicker">{m.history.explore}</p>
        <ul className="mega-list">
          <Described href={`/${lang}/history`} icon="calendar" name={t.history.seasons} line={m.history.seasonsLine} />
          <Described href={`/${lang}/records`} icon="trophy" name={t.history.records} line={m.history.recordsLine} />
          <Described href={`/${lang}/compare`} icon="user" name={t.history.compare} line={m.history.compareLine} />
        </ul>
      </section>

      <section className="mega-col" aria-label={t.records.title}>
        <p className="panel-kicker">{t.records.title}</p>
        <ul className="mega-links">
          {(["wins", "poles", "win-streak", "comebacks", "starts"] as const).map((type) => (
            <li key={type}>
              <Link href={`/${lang}/records/${type}`}><span>{t.records.types[type].name}</span></Link>
            </li>
          ))}
        </ul>
      </section>

      <Quick
        items={[
          { href: `/${lang}/history`, icon: "calendar", label: t.history.seasons },
          { href: `/${lang}/records`, icon: "trophy", label: t.history.records },
          { href: `/${lang}/compare`, icon: "user", label: t.history.compare },
        ]}
      />
    </div>
  );
}

export function LearnPanel({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const m = t.header.mega;
  const guide = EXPLAINERS.find((e) => e.slug === "guide");
  const explainers = EXPLAINERS.filter((e) => e.slug !== "guide").slice(0, 6);
  const notes = [...NOTES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="mega">
      <section className="mega-col" aria-label={t.learn.guide}>
        <p className="panel-kicker">{t.learn.guide}</p>
        {guide ? (
          <>
            <Link href={`/${lang}/learn/${guide.slug}`} className="panel-title panel-title-small">
              {guide.title[lang]}
            </Link>
            <p className="panel-meta mega-lede">{guide.description[lang]}</p>
          </>
        ) : null}
        <p className="panel-kicker mega-sub">{m.learn.notes}</p>
        <ul className="mega-links">
          {notes.map((n) => (
            <li key={n.slug}>
              <Link href={`/${lang}/notes/${n.slug}`}><span>{n.title[lang]}</span></Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mega-col" aria-label={t.learn.explainers}>
        <p className="panel-kicker">{t.learn.explainers}</p>
        <ul className="mega-links">
          {explainers.map((e) => (
            <li key={e.slug}>
              <Link href={`/${lang}/learn/${e.slug}`}><span>{e.title[lang]}</span></Link>
            </li>
          ))}
        </ul>
        <Link href={`/${lang}/learn`} className="panel-more">
          {m.learn.all}
        </Link>
      </section>

      <section className="mega-col" aria-label={m.learn.more}>
        <p className="panel-kicker">{m.learn.more}</p>
        <ul className="mega-list">
          <Described href={`/${lang}/learn/glossary`} icon="book" name={t.learn.glossary} line={m.learn.glossaryLine} />
          <Described href={`/${lang}/learn#circuit-guides`} icon="pin" name={t.learn.circuitGuides} line={m.learn.circuitsLine} />
          <Described href={`/${lang}/quiz`} icon="eye" name={t.quiz.title} line={m.learn.quizLine} />
        </ul>
      </section>

      <Quick
        items={[
          { href: `/${lang}/learn`, icon: "book", label: t.learn.title },
          { href: `/${lang}/notes`, icon: "flag", label: m.learn.notes },
          { href: `/${lang}/learn/glossary`, icon: "layers", label: t.learn.glossary },
        ]}
      />
    </div>
  );
}
