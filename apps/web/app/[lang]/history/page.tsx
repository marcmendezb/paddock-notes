import type { Metadata } from "next";
import Link from "next/link";
import { RECORDS_PUBLIC } from "@/lib/records";
import { FIRST_SEASON, gpName, type RecordType } from "@paddock/shared";
import { Icon, type IconName } from "@/components/icons";
import { api } from "@/lib/api";
import { fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).history;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/history`, languages: { es: "/es/history", en: "/en/history", de: "/de/history" } },
  };
}

const BIG: { type: RecordType; icon: IconName }[] = [
  { type: "wins", icon: "trophy" },
  { type: "poles", icon: "stopwatch" },
  { type: "podiums", icon: "layers" },
  { type: "starts", icon: "flag" },
  { type: "win-streak", icon: "bolt" },
  { type: "comebacks", icon: "chart" },
];

/**
 * Portada del histórico (HIS-08, HIS-09): la F1 desde 1950 como una banda de trazos, uno por temporada;
 * esta semana en la historia; los grandes números (el primero de cada récord); las herramientas para
 * explorar, y todas las temporadas agrupadas por décadas.
 */
export default async function HistoryPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const h = t.history;
  const [events, seasons, ...records] = await Promise.all([
    api.thisWeek().catch(() => null),
    api.seasons().catch(() => null),
    ...BIG.map((b) => api.records(b.type).catch(() => null)),
  ]);
  const available = new Set(seasons?.data ?? []);
  const last = Math.max(new Date().getUTCFullYear(), ...(seasons?.data ?? []));
  const years = Array.from({ length: last - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i);
  const decades = [...new Set(years.map((y) => Math.floor(y / 10) * 10))];
  const leaders = BIG.map((b, i) => ({ ...b, rows: records[i]?.data.slice(0, 3) ?? [] })).filter((b) => b.rows.length > 0);
  const tools: { href: string; icon: IconName; name: string; line: string; ink?: boolean }[] = [
    ...(RECORDS_PUBLIC ? [{ href: `/${lang}/records`, icon: "trophy" as const, name: h.records, line: t.records.lede, ink: true }] : []),
    { href: `/${lang}/compare`, icon: "user", name: h.compare, line: t.compare.lede, ink: !RECORDS_PUBLIC },
    { href: `/${lang}/simulator`, icon: "gauge", name: t.simulator.title, line: t.simulator.lede },
    { href: `/${lang}/predictions`, icon: "flag", name: t.predictions.title, line: t.predictions.lede },
    { href: `/${lang}/quiz`, icon: "eye", name: t.quiz.title, line: t.quiz.lede },
  ];

  return (
    <article className="rv hv">
      <section className="rv-hero hv-hero" data-surface="ink" aria-labelledby="history-title">
        <div className="container hv-hero-grid">
          <div className="hv-head">
            <p className="eyebrow rv-kicker">
              <Icon name="calendar" /> {h.range(FIRST_SEASON, last)}
            </p>
            <h1 id="history-title" className="hv-title">
              {h.title}
            </h1>
            <p className="hv-lede">{h.lede}</p>
          </div>
          <figure className="hv-years">
            <figcaption className="hv-years-head">
              <span>{h.yearByYear}</span>
              <span className="hv-years-count">{h.seasonsCount(years.length)}</span>
            </figcaption>
            {/* Visualización: los enlaces accesibles a cada temporada están en «Todas las temporadas». */}
            <ol className="hv-barcode" aria-hidden="true">
              {years.map((y) => (
                <li key={y} className={`${y === last ? "is-now" : ""}${y % 10 === 0 ? " is-decade" : ""}${available.has(y) ? " has-data" : ""}`}>
                  <span data-year={y} />
                  {y % 10 === 0 ? (
                    <span className="hv-tick" aria-hidden="true">
                      {y}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </figure>
        </div>
      </section>

      <div className="container stack-xl">
        <section aria-labelledby="this-week" className="rv-section">
          <h2 id="this-week" className="rv-h2">
            {h.thisWeek}
          </h2>
          {events && events.data.length > 0 ? (
            <ol className="rv-winners hv-week">
              {events.data.map((e) => (
                <li key={`${e.season}-${e.round}`}>
                  <Link href={`/${lang}/races/${e.season}/${e.round}`} className="rv-winner">
                    <span className="rv-winner-year tabular">{e.season}</span>
                    <span className="rv-winner-name">{e.winner ? fullName(e.winner) : "—"}</span>
                    <span className="rv-winner-team">{gpName(lang, e.name)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="hv-empty">
              <Icon name="clock" /> {h.noEvents}
            </p>
          )}
        </section>

        {leaders.length ? (
          <section aria-labelledby="big-numbers" className="rv-section">
            <h2 id="big-numbers" className="rv-h2">
              {h.bigNumbers}
            </h2>
            <p className="rv-section-lede">{h.bigNumbersLede}</p>
            <ul className="hv-big icon-scroll">
              {leaders.map((b, i) => {
                const [top, ...rest] = b.rows;
                return (
                  <li key={b.type} className={i === 0 ? "is-feature" : undefined}>
                    <MaybeLink href={RECORDS_PUBLIC ? `/${lang}/records/${b.type}` : null} className="hv-big-card" surface={i === 0 ? "ink" : undefined}>
                      <span className="hv-big-label">
                        <Icon name={b.icon} /> {t.records.types[b.type].name}
                      </span>
                      <span className="hv-big-value tabular">{top!.value}</span>
                      <span className="hv-big-who">{fullName(top!.driver)}</span>
                      <span className="hv-big-def">{t.records.types[b.type].def}</span>
                      {rest.length ? (
                        <span className="hv-big-rest">
                          {rest.map((r) => (
                            <span key={r.driver.id} className="hv-big-row">
                              <span className="hv-big-row-name">
                                {r.rank}. {r.driver.familyName}
                              </span>
                              <span className="hv-big-row-value tabular">{r.value}</span>
                              <svg className="hv-big-bar" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                                <rect width="100" height="4" className="hv-big-bar-rail" />
                                <rect width={Math.max(2, (r.value / Math.max(1, top!.value)) * 100).toFixed(1)} height="4" className="hv-big-bar-fill" />
                              </svg>
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </MaybeLink>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="explore" className="rv-section">
          <h2 id="explore" className="rv-h2">
            {h.explore}
          </h2>
          <ul className="hv-tools">
            {tools.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="rv-preview-card hv-tool" data-surface={tool.ink ? "ink" : undefined}>
                  <Icon name={tool.icon} />
                  <span className="rv-preview-title">{tool.name}</span>
                  <span className="rv-preview-line">{tool.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="seasons" className="rv-section">
          <h2 id="seasons" className="rv-h2">
            {h.seasons}
          </h2>
          <div className="hv-decade-list">
            {decades
              .slice()
              .reverse()
              .map((d) => (
                <div key={d} className="hv-decade">
                  <h3 className="hv-decade-name">{h.decade(d)}</h3>
                  <ul className="hv-chips">
                    {years
                      .filter((y) => Math.floor(y / 10) * 10 === d)
                      .reverse()
                      .map((y) => (
                        <li key={y}>
                          {available.has(y) ? (
                            <Link href={`/${lang}/races/${y}`} className="tabular">
                              {y}
                            </Link>
                          ) : (
                            <span className="tabular is-empty" title={h.noData}>
                              {y}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      </div>
    </article>
  );
}

/** Tarjeta que enlaza a su récord solo si las páginas de récords están publicadas (D-34). */
function MaybeLink({ href, className, surface, children }: { href: string | null; className: string; surface?: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={className} data-surface={surface}>
      {children}
    </Link>
  ) : (
    <div className={className} data-surface={surface}>
      {children}
    </div>
  );
}
