import type { Lang } from "@paddock/shared";
import { notesFor } from "@/content/circuits";
import { localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import type { LapLayout } from "./lap-stage";

/**
 * A circuit's fastest lap, on its page (NUC-43, NUC-44): the speed trace metre by metre, its figures and
 * each braking zone. Everything comes from the OpenF1 telemetry ingestion already stores (D-09); nothing is
 * invented: each sample's distance is its position on the layout, scaled to the lap's length.
 * SVG drawn on the server, with attributes and classes (CSP, D-04).
 */

export type Telemetry = LapLayout & { length: number; season: number; driver: { code: string; name: string } };

/** Distance (m) of each point from the finish line, with the full lap at the end. */
function distances(t: Telemetry): number[] {
  const closed = [...t.points, t.points[0]!];
  const acc = [0];
  for (let i = 1; i < closed.length; i++) {
    const [ax, ay] = closed[i - 1]!;
    const [bx, by] = closed[i]!;
    acc.push(acc[i - 1]! + Math.hypot(bx - ax, by - ay));
  }
  const total = acc.at(-1)! || 1;
  return acc.map((d) => (d / total) * t.length);
}

/** Index of the layout point closest to a braking zone. */
function nearest(t: Telemetry, point: [number, number]): number {
  let best = 0;
  let bestD = Infinity;
  t.points.forEach((p, i) => {
    const d = Math.hypot(p[0] - point[0], p[1] - point[1]);
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

export function lapNumbers(t: Telemetry) {
  const top = Math.max(...t.speeds);
  const avg = t.length / 1000 / (t.lapTime / 3600);
  const slowest = t.corners.reduce<Telemetry["corners"][number] | null>((m, c) => (!m || c.speed < m.speed ? c : m), null);
  // Time above 300 km/h: each stretch between two samples counts if its mean speed exceeds it.
  const rel = [...t.times.map((x) => x - (t.times[0] ?? 0)), t.lapTime];
  let flat = 0;
  for (let i = 0; i < t.speeds.length; i++) {
    const v = (t.speeds[i]! + t.speeds[(i + 1) % t.speeds.length]!) / 2;
    if (v > 300) flat += (rel[i + 1] ?? t.lapTime) - (rel[i] ?? 0);
  }
  return { top, avg, slowest, flatShare: flat / t.lapTime };
}

const W = 1000;
const H = 300;
const M = { l: 8, r: 70, t: 34, b: 30 };

export function SpeedTrace({ lang, t, name }: { lang: Lang; t: Telemetry; name: string }) {
  const v = dict(lang).circuitView;
  const nf = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 2 });
  const d = distances(t);
  const speeds = [...t.speeds, t.speeds[0]!];
  const yMax = Math.ceil(Math.max(...speeds) / 50) * 50;
  const x = (m: number) => M.l + (m / t.length) * (W - M.l - M.r);
  const y = (s: number) => M.t + (1 - s / yMax) * (H - M.t - M.b);
  const line = speeds.map((s, i) => `${i ? "L" : "M"}${x(d[i]!).toFixed(1)},${y(s).toFixed(1)}`).join("");
  const area = `${line}L${x(t.length).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;
  const { top, slowest } = lapNumbers(t);
  const topI = t.speeds.indexOf(top);
  const km = Array.from({ length: Math.floor(t.length / 1000) }, (_, i) => (i + 1) * 1000).filter((m) => t.length - m > 350);
  const grid = [100, 200, 300].filter((g) => g < yMax);

  return (
    <div className="ctrace">
      <div className="ctrace-scroll" tabIndex={0} role="region" aria-label={v.scrollChart}>
        <svg className="ctrace-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={v.traceLabel(name, top, slowest?.speed ?? Math.min(...t.speeds))}>
          <defs>
            <linearGradient id="ctrace-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="ctrace-stop-top" />
              <stop offset="1" className="ctrace-stop-bottom" />
            </linearGradient>
          </defs>
          {grid.map((g) => (
            <g key={g} className="ctrace-grid">
              <line x1={M.l} x2={W - M.r} y1={y(g)} y2={y(g)} />
              <text x={W - M.r + 10} y={y(g)} dy="0.35em">
                {g === grid.at(-1) ? `${g} km/h` : g}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="ctrace-base" />
          {km.map((m) => (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="ctrace-km">
              {nf.format(m / 1000)}
            </text>
          ))}
          <text x={x(t.length)} y={H - 8} textAnchor="end" className="ctrace-km">
            {nf.format(t.length / 1000)} km
          </text>
          <path d={area} className="ctrace-area" />
          <path d={line} pathLength={1} className="ctrace-line" />
          {t.corners.map((c) => {
            const i = nearest(t, c.point);
            const cx = x(d[i]!);
            const cy = y(c.speed);
            return (
              <g key={c.n} className={c === slowest ? "ctrace-corner is-slowest" : "ctrace-corner"}>
                <line x1={cx} x2={cx} y1={cy + 12} y2={y(0)} />
                <circle cx={cx} cy={cy} r={5} />
                <text x={cx} y={y(0) - 10} textAnchor="middle">
                  {c.n}
                </text>
              </g>
            );
          })}
          {/* The brand's two notes: the top speed and the slowest braking zone. */}
          {topI >= 0 ? (
            <g className="ctrace-note">
              <circle cx={x(d[topI]!)} cy={y(top)} r={4.5} />
              <text x={x(d[topI]!)} y={y(top) - 14} textAnchor={x(d[topI]!) > W * 0.75 ? "end" : "middle"}>
                {top} km/h, {v.topNote}
              </text>
            </g>
          ) : null}
          {slowest ? (
            <g className="ctrace-note is-low">
              {/* To the right of the dot, or to the left if it is in the last third and would not fit. */}
              <text
                x={x(d[nearest(t, slowest.point)]!) + (x(d[nearest(t, slowest.point)]!) > W * 0.6 ? -14 : 14)}
                y={y(slowest.speed) + 4}
                textAnchor={x(d[nearest(t, slowest.point)]!) > W * 0.6 ? "end" : "start"}
              >
                {slowest.speed} km/h, {v.slowNote(slowest.n)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

export function LapStats({ lang, t }: { lang: Lang; t: Telemetry }) {
  const v = dict(lang).circuitView;
  const nf = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 0 });
  const { top, avg, slowest, flatShare } = lapNumbers(t);
  type Stat = { label: string; value: string; unit?: string; sub?: string };
  const stats = ([
    { label: v.stats.top, value: `${top}`, unit: "km/h" },
    { label: v.stats.avg, value: nf.format(avg), unit: "km/h" },
    slowest ? { label: v.stats.slowest, value: `${slowest.speed}`, unit: "km/h", sub: `${dict(lang).circuit.brakingCols.n} ${slowest.n} · ${v.gear(slowest.gear)}` } : null,
    { label: v.stats.flat, value: `${Math.round(flatShare * 100)}`, unit: "%", sub: v.stats.ofLap },
    { label: v.stats.zones, value: `${t.corners.length}` },
  ] as (Stat | null)[]).filter((s): s is Stat => s !== null);
  return (
    <dl className="cstats">
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>
            <span className="cstats-value tabular">{s.value}</span>
            {s.unit ? <span className="cstats-unit">{s.unit}</span> : null}
            {s.sub ? <span className="cstats-sub">{s.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Each braking zone as a card: number, minimum speed with its bar, gear and, if there is one, the editorial note. */
export function CornerCards({ lang, t, circuitId }: { lang: Lang; t: Telemetry; circuitId: string }) {
  const c = dict(lang).circuit;
  const v = dict(lang).circuitView;
  const notes = notesFor(circuitId, t.corners);
  const top = Math.max(...t.speeds);
  const slowest = Math.min(...t.corners.map((k) => k.speed));
  return (
    <ol className="ccorners">
      {t.corners.map((k) => {
        const note = notes.get(k.n);
        return (
          <li key={k.n} className={k.speed === slowest ? "is-slowest" : undefined}>
            <span className="ccorners-n tabular" aria-hidden="true">
              {String(k.n).padStart(2, "0")}
            </span>
            <span className="visually-hidden">
              {c.brakingCols.n} {k.n}.
            </span>
            <span className="ccorners-speed">
              <span className="tabular">{k.speed}</span> km/h
            </span>
            <svg className="ccorners-bar" width="100%" height="6" aria-hidden="true" focusable="false">
              <rect x="0" y="0" width="100%" height="6" className="ccorners-rail" />
              <rect x="0" y="0" width={`${((k.speed / top) * 100).toFixed(1)}%`} height="6" className="ccorners-fill" />
            </svg>
            <span className="ccorners-gear">{k.gear ? v.gear(k.gear) : "—"}</span>
            {k.speed === slowest ? <span className="ccorners-tag">{c.slowest}</span> : null}
            {note ? (
              <span className="ccorners-note">
                <strong>{c.turn(note.turn)}.</strong> {note.note[lang]}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
