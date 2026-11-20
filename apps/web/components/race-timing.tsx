import type { ReactNode } from "react";
import type { Lang, PitStopEntry, QualifyingEntry, RaceResultRow } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon } from "./icons";
import { DriverLink } from "./links";

/**
 * The race page's tables as a timing screen, on black (data-surface="ink").
 * They remain HTML tables (headers, rows, text): bars and arrows are a visual addition, never the only
 * data (TRA-20, TRA-22). Bars use percentages as SVG attributes (D-04).
 */

const pct = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;

/** "+0.799" → 0.799; "+1:02.345" → 62.345; "2:20:28.772" (the winner) → 0. Laps or statuses → null. */
function gapSeconds(time: string | null, isWinner: boolean): number | null {
  if (isWinner) return 0;
  if (!time || !time.startsWith("+")) return null;
  const parts = time.slice(1).split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function isFavorite(favorites: Set<string>, driverId: string, teamId: string): boolean {
  return favorites.has(`d:${driverId}`) || favorites.has(`c:${teamId}`);
}

/** Result: position, driver and team, grid to finish, gap with a bar and points. */
export function ResultsTower({ lang, results, favorites, label }: { lang: Lang; results: RaceResultRow[]; favorites: Set<string>; label: string }) {
  const t = dict(lang);
  const c = t.race.columns;
  const gaps = results.map((r, i) => gapSeconds(r.time, i === 0 && r.position === 1));
  const max = Math.max(1, ...gaps.filter((g): g is number => g !== null));
  return (
    <div className="timing" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
        <table className="timing-table">
          <thead>
            <tr>
              <th scope="col" className="num">{c.pos}</th>
              <th scope="col">{c.driver}</th>
              <th scope="col" className="num">{c.grid}</th>
              <th scope="col" className="timing-gap-col">{c.time}</th>
              <th scope="col" className="num">{c.points}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const fav = isFavorite(favorites, r.driver.id, r.constructor.id);
              const gap = gaps[i] ?? null;
              const classified = r.position !== null && /^\d+$/.test(r.positionText);
              return (
                <tr key={`${r.driver.id}-${r.constructor.id}`} className={`${i < 3 ? `is-p${i + 1}` : ""}${fav ? " is-favorite" : ""}`}>
                  <td className="num timing-pos">{classified ? r.position : r.positionText}</td>
                  <th scope="row" className="timing-driver">
                    <span className="timing-who">
                    <DriverLink lang={lang} driver={r.driver} />
                    <span className="timing-team">{r.constructor.name}</span>
                    {fav ? <span className="tag tag-fav">{t.favorite}</span> : null}
                    {r.fastestLap?.rank === 1 ? (
                      <span className="timing-fastest">
                        <Icon name="stopwatch" /> {t.race.fastestMark}
                        {r.fastestLap.time ? ` · ${r.fastestLap.time}` : ""}
                      </span>
                    ) : null}
                    </span>
                  </th>
                  <td className="num timing-grid">
                    <span className="tabular">{r.grid === 0 ? "PL" : (r.grid ?? "—")}</span>
                    {r.positionsGained ? (
                      <span className={r.positionsGained > 0 ? "timing-delta is-up" : "timing-delta is-down"}>
                        {r.positionsGained > 0 ? "▲" : "▼"} {Math.abs(r.positionsGained)}
                      </span>
                    ) : null}
                  </td>
                  <td className="timing-gap">
                    <span className="timing-gap-inner">
                    {gap !== null ? (
                      <svg className="timing-bar" aria-hidden="true" focusable="false">
                        <rect x="0" y="0" width="100%" height="100%" className="timing-bar-rail" />
                        <rect x="0" y="0" width={i === 0 ? "100%" : pct((gap / max) * 100)} height="100%" className={i === 0 ? "timing-bar-win" : "timing-bar-fill"} />
                      </svg>
                    ) : null}
                    <span className={gap !== null ? "timing-gap-text tabular" : "timing-gap-text is-status"}>{r.time ?? r.status}</span>
                    </span>
                  </td>
                  <td className="num timing-points">{r.points ? formatPoints(lang, r.points) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lapTime = (s: string | null) => {
  if (!s) return null;
  const parts = s.split(":").map(Number);
  return parts.some((n) => Number.isNaN(n)) ? null : parts.reduce((acc, n) => acc * 60 + n, 0);
};

/** Qualifying: those knocked out in Q1 and Q2 dimmed and each session's best time highlighted. */
export function QualifyingTower({ lang, rows, label }: { lang: Lang; rows: QualifyingEntry[]; label: string }) {
  const t = dict(lang);
  const v = t.raceView;
  const best = (["q1", "q2", "q3"] as const).map((k) => Math.min(...rows.map((r) => lapTime(r[k]) ?? Infinity)));
  const knockout = rows.some((r) => r.q3);
  return (
    <div className="timing" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
        <table className="timing-table">
          <thead>
            <tr>
              <th scope="col" className="num">{t.race.columns.pos}</th>
              <th scope="col">{t.race.columns.driver}</th>
              <th scope="col" className="num">Q1</th>
              <th scope="col" className="num">Q2</th>
              <th scope="col" className="num">Q3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const out = knockout && r.position ? (r.position > 15 ? "q1" : r.position > 10 ? "q2" : null) : null;
              return (
                <tr key={r.driver.id} className={`${r.position === 1 ? "is-p1" : ""}${out ? ` is-out` : ""}`}>
                  <td className="num timing-pos">{r.position ?? "—"}</td>
                  <th scope="row" className="timing-driver">
                    <span className="timing-who">
                    <DriverLink lang={lang} driver={r.driver} />
                    <span className="timing-team">{r.constructor.name}</span>
                    {out ? <span className="timing-out">{out === "q1" ? v.outQ1 : v.outQ2}</span> : null}
                    </span>
                  </th>
                  {(["q1", "q2", "q3"] as const).map((k, i) => (
                    <td key={k} className={lapTime(r[k]) === best[i] ? "num timing-best" : "num"}>
                      {r[k] ?? "—"}
                      {lapTime(r[k]) === best[i] ? <span className="visually-hidden"> · {v.best}</span> : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Pit stops as a timeline: one row per driver (in finishing order), each stop on its lap.
 * The fastest one in lilac. Below, the full table expands.
 */
export function PitTimeline({
  lang,
  stops,
  order,
  laps,
  table,
}: {
  lang: Lang;
  stops: PitStopEntry[];
  order: RaceResultRow[];
  laps: number;
  table: ReactNode;
}) {
  const t = dict(lang);
  const v = t.raceView;
  const total = Math.max(1, laps);
  const fastest = stops.reduce<PitStopEntry | null>(
    (min, s) => (s.durationMs !== null && (!min || (min.durationMs ?? Infinity) > s.durationMs) ? s : min),
    null,
  );
  const drivers = order.filter((r) => stops.some((s) => s.driver.id === r.driver.id));
  const ticks = [1, ...Array.from({ length: 4 }, (_, i) => Math.round(((i + 1) * total) / 5)), total];
  return (
    <div className="timing pits" data-surface="ink">
      {fastest ? (
        <p className="pits-fastest">
          <Icon name="stopwatch" />
          {/* One text run, so it wraps as a sentence and the comma never starts a line on its own. */}
          <span>
            {v.fastestStop}: <strong>{fastest.driver.familyName}</strong>
            {`, ${fastest.duration} s (${t.analysis.lap} ${fastest.lap})`}
          </span>
        </p>
      ) : null}
      <ol className="pits-rows" aria-hidden="true">
        {drivers.map((r) => (
          <li key={r.driver.id}>
            <span className="pits-name">{r.driver.code ?? r.driver.familyName}</span>
            <svg className="pits-track" focusable="false">
              <line x1="0" x2="100%" y1="50%" y2="50%" className="pits-rail" />
              {stops
                .filter((s) => s.driver.id === r.driver.id)
                .map((s) => (
                  <svg key={s.stop} x={pct((s.lap / total) * 100)} y="50%" overflow="visible">
                    <rect x="-5" y="-5" width="10" height="10" className={s === fastest ? "pits-stop is-fastest" : "pits-stop"} />
                  </svg>
                ))}
            </svg>
          </li>
        ))}
        <li className="pits-axis">
          <span className="pits-name">{t.analysis.lap}</span>
          <svg className="pits-track" focusable="false">
            {ticks.map((l, i) => (
              <text key={`${l}-${i}`} x={pct((l / total) * 100)} y="70%" textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
                {l}
              </text>
            ))}
          </svg>
        </li>
      </ol>
      <details className="pits-details">
        <summary>{v.allStops}</summary>
        {table}
      </details>
    </div>
  );
}
