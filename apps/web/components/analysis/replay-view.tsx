"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useEffect, useState } from "react";
import type { ReplayData } from "@paddock/analysis";

/**
 * Revive la carrera (TEC-07): posiciones vuelta a vuelta con reproducción, pausa y velocidad.
 * Con prefers-reduced-motion no hay animación: la vista es estática y se recorre con el control de vuelta.
 */

export interface ReplayLabels {
  play: string;
  pause: string;
  speed: string;
  lap: string;
  lapOf: string;
  title: string;
}

const W = 760;
const ROW = 18;
const M = { top: 16, right: 60, bottom: 24, left: 16 };

export function ReplayView({ data, labels }: { data: ReplayData; labels: ReplayLabels }) {
  const [lap, setLap] = useState(data.laps);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last > 600 / speed) {
        last = now;
        setLap((l) => {
          if (l >= data.laps) {
            setPlaying(false);
            return l;
          }
          return l + 1;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, speed, data.laps]);

  const field = data.drivers.length;
  const H = M.top + field * ROW + M.bottom;
  const x = scaleLinear().domain([1, data.laps]).range([M.left, W - M.right]);
  const y = scaleLinear().domain([1, field]).range([M.top + ROW / 2, M.top + (field - 0.5) * ROW]);
  const path = line<number | null>()
    .defined((p) => p !== null)
    .x((_, i) => x(i + 1))
    .y((p) => y(p ?? 1));

  const start = () => {
    if (lap >= data.laps) setLap(1);
    setPlaying(true);
  };

  return (
    <div className="stack">
      <div className="controls">
        {reduced ? null : (
          <button type="button" onClick={() => (playing ? setPlaying(false) : start())}>
            {playing ? labels.pause : labels.play}
          </button>
        )}
        {reduced ? null : (
          <label>
            {labels.speed}{" "}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {[1, 2, 4].map((s) => (
                <option key={s} value={s}>
                  ×{s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="controls">
          <span>{labels.lapOf.replace("{n}", String(lap)).replace("{total}", String(data.laps))}</span>
          <input
            type="range"
            min={1}
            max={data.laps}
            value={lap}
            onChange={(e) => {
              setPlaying(false);
              setLap(Number(e.target.value));
            }}
            aria-label={labels.lap}
          />
        </label>
      </div>
      <figure className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={labels.title}>
          {data.drivers.map((d) => {
            const shown = d.positions.slice(0, lap);
            const current = [...shown].reverse().find((p) => p !== null) ?? null;
            const lastIndex = shown.length - 1 - [...shown].reverse().findIndex((p) => p !== null);
            const highlight = d.finish !== null && d.finish <= 3;
            return (
              <g key={d.number} className={highlight ? `series series-${d.finish}` : "series replay-other"}>
                <path d={path(shown) ?? undefined} className="series-line" />
                {current !== null ? (
                  <text x={x(lastIndex + 1) + 6} y={y(current)} dy="0.32em" className="chart-label">
                    {d.code}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </figure>
      <ol className="visually-hidden">
        {data.drivers
          .map((d) => ({ d, p: d.positions[lap - 1] ?? null }))
          .filter((r) => r.p !== null)
          .sort((p, q) => p.p! - q.p!)
          .map((r) => (
            <li key={r.d.number}>
              {r.p}. {r.d.name}
            </li>
          ))}
      </ol>
    </div>
  );
}
