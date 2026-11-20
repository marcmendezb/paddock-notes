import type { ReactNode } from "react";
import { gpName, LIST_TIMEZONE, noteFor, type Lang, type RaceDetail, type RaceSummary } from "@paddock/shared";
import { formatDate, formatDateTime } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon, type IconName } from "./icons";

/**
 * The home page newsletter (NUC-10): instead of promising it, it is shown. On the left, what it brings and
 * the form; on the right, a sample issue made with the real last race (the note, the top 5, the winner's
 * position chart and the next race in Madrid or London time), on stacked sheets
 * that straighten as you scroll.
 */

const ICONS: IconName[] = ["flag", "chart", "book", "calendar"];

/** The winner's position lap by lap, as a 240 × 64 line (P1 at the top, P10 at the bottom). */
function WinnerLine({ positions }: { positions: (number | null)[] }) {
  const W = 240;
  const H = 64;
  // The scale reaches the winner's worst position (P4 at least), so the line fills the height.
  const depth = Math.max(4, ...positions.filter((p): p is number => p !== null));
  const n = Math.max(2, positions.length);
  let d = "";
  let pen = false;
  positions.forEach((p, i) => {
    if (p === null) {
      pen = false;
      return;
    }
    const x = (i / (n - 1)) * W;
    const y = 4 + ((Math.min(p, depth) - 1) / (depth - 1)) * (H - 8);
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    pen = true;
  });
  return (
    <svg className="nl-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <line x1="0" x2={W} y1="4" y2="4" className="nl-chart-ref" />
      <path d={d} pathLength={1} className="nl-chart-line" />
    </svg>
  );
}

export function NewsletterBand({
  lang,
  race,
  winnerPositions,
  next,
  form,
}: {
  lang: Lang;
  race: RaceDetail | null;
  winnerPositions: (number | null)[] | null;
  next: RaceSummary | null;
  /** The form (a server component). */
  form: ReactNode;
}) {
  const t = dict(lang).newsletter;
  const note = race ? noteFor(race.season, race.round) : null;
  const winner = race?.results[0];
  const zone = LIST_TIMEZONE[lang];

  return (
    <section className="nl" aria-labelledby="newsletter">
      <div className="container nl-grid">
        <div className="nl-copy">
          <p className="eyebrow nl-kicker icon-scroll">
            <Icon name="book" /> {t.title}
          </p>
          <h2 id="newsletter" className="nl-title">
            {t.lede}
          </h2>
          <ol className="nl-contents icon-scroll">
            {t.contents.map((item, i) => (
              <li key={item}>
                <Icon name={ICONS[i] ?? "flag"} />
                {item}
              </li>
            ))}
          </ol>
          <div className="nl-form">{form}</div>
        </div>

        {race && winner ? (
          <figure className="nl-issue" aria-labelledby="nl-sample">
            <figcaption id="nl-sample" className="nl-sample">
              {t.sample}
            </figcaption>
            <div className="nl-sheets">
              <span className="nl-sheet nl-sheet-back" aria-hidden="true" />
              <span className="nl-sheet nl-sheet-mid" aria-hidden="true" />
              <article className="nl-sheet nl-sheet-front" data-surface="ink">
                <header className="nl-issue-head">
                  <span className="nl-issue-brand">Paddock Notes</span>
                  <span className="nl-issue-no">
                    {t.issue(race.round)} · {formatDate(lang, race.date)}
                  </span>
                </header>
                <h3 className="nl-issue-title">{note ? note.title[lang] : gpName(lang, race.name)}</h3>

                <p className="nl-issue-label">{t.lines}</p>
                <ol className="nl-lines">
                  {race.results.slice(0, 5).map((r, i) => (
                    <li key={r.driver.id}>
                      <span className="nl-line-pos">{i + 1}</span>
                      <span className="nl-line-name">{r.driver.familyName}</span>
                      <span className="nl-line-team">{r.constructor.name}</span>
                    </li>
                  ))}
                </ol>

                {winnerPositions && winnerPositions.length > 1 ? (
                  <div className="nl-issue-chart">
                    <p className="nl-issue-label">
                      {t.chart} · {t.chartOf(winner.driver.familyName)}
                    </p>
                    <WinnerLine positions={winnerPositions} />
                  </div>
                ) : null}

                {next?.startsAt ? (
                  <p className="nl-next">
                    <Icon name="calendar" />
                    <span>
                      <span className="nl-issue-label">{t.nextUp}</span>
                      <span className="nl-next-text">
                        {gpName(lang, next.name)} · {formatDateTime(lang, next.startsAt, zone)} ({t.zone})
                      </span>
                    </span>
                  </p>
                ) : null}
              </article>
            </div>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
