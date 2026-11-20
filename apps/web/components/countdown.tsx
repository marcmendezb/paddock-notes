"use client";

import { useEffect, useState } from "react";

interface Props {
  startsAt: string;
  /** Start of the previous Grand Prix: the origin of the dimension line. Without it, the line measures the last two weeks. */
  fromIso: string | null;
  /** Server time at render: the countdown is already painted in the HTML (it is the home page's LCP). */
  serverNow: number;
  units: { d: string; h: string; m: string; s: string };
  startedLabel: string;
  labels: { from: string; now: string; to: string };
  /** The dimension line's label ("Until the start"), to the left of the figures. Visible; the accessible text is separate. */
  caption?: string;
}

const TWO_WEEKS = 14 * 86_400_000;
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * The countdown as a dimension line to scale (NUC-02, brand.md §1): a measuring line running from the start
 * of the previous Grand Prix to this one's. What has passed is dashed; what is left, in lime, with its value
 * written above. All with percentage attributes inside the SVG: no inline styles (CSP, D-04).
 * It is painted on the server with its time and the client updates it every second; the numbers and the
 * line carry aria-hidden: the accessible text is the static sentence that goes with it.
 */
export function Countdown({ startsAt, fromIso, serverNow, units, startedLabel, labels, caption }: Props) {
  const [now, setNow] = useState<number>(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = Date.parse(startsAt);
  const remaining = Math.max(0, end - now);
  if (remaining === 0) return <p className="countdown-done">{startedLabel}</p>;

  const start = fromIso ? Date.parse(fromIso) : end - TWO_WEEKS;
  const ratio = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  const anchor = ratio < 0.12 ? "start" : ratio > 0.82 ? "end" : "middle";

  const s = Math.floor(remaining / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), units.d],
    [Math.floor((s % 86400) / 3600), units.h],
    [Math.floor((s % 3600) / 60), units.m],
    [s % 60, units.s],
  ];

  return (
    <div className="countdown" aria-hidden="true">
      <div className="countdown-row">
        {caption ? <p className="countdown-caption">{caption}</p> : null}
        <dl className="countdown-values">
        {parts.map(([value, unit]) => (
          <div key={unit} className="countdown-part">
            <dt className="countdown-unit">{unit}</dt>
            <dd className="countdown-value" suppressHydrationWarning>
              {/* The key changes with the value: each new figure enters with its animation. */}
              <span key={value} className="countdown-digit">
                {String(value).padStart(2, "0")}
              </span>
            </dd>
          </div>
        ))}
        </dl>
      </div>
      <svg className="cota-scale" width="100%" height="72" focusable="false">
        {/* What has passed since the previous Grand Prix: a reference, dashed. */}
        <line className="cota-elapsed" x1="0%" x2={pct(ratio)} y1="32" y2="32" />
        {/* What is left: the dimension line, in lime, with ticks at both ends. */}
        <line className="cota-remaining" x1={pct(ratio)} x2="100%" y1="32" y2="32" pathLength={1} />
        <line className="cota-tick cota-tick-from" x1="1" x2="1" y1="22" y2="42" />
        <line className="cota-tick cota-tick-now" x1={pct(ratio)} x2={pct(ratio)} y1="16" y2="48" />
        <line className="cota-tick cota-tick-to" x1="99.85%" x2="99.85%" y1="22" y2="42" />
        {/* "Now", above the line: it never collides with the end labels, which sit below. */}
        <text className="cota-label cota-label-now" x={pct(ratio)} y="11" textAnchor={anchor}>
          {labels.now}
        </text>
        <text className="cota-label" x="0" y="66">
          {labels.from}
        </text>
        <text className="cota-label cota-label-to" x="100%" y="66" textAnchor="end">
          {labels.to}
        </text>
      </svg>
    </div>
  );
}
