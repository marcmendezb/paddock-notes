"use client";

import { useEffect, useRef, useState } from "react";
import { IconPaths } from "./icons";
import type { LapLayout } from "./lap-stage";

const BUCKETS = 5;
/** Cuánto se queda atrás cada punto de la estela, en segundos de la vuelta. */
const TRAIL = [0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.5];

function clock(s: number): string {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(3).padStart(6, "0")}`;
}

/**
 * La vuelta rápida del circuito, a tiempo real (ficha de circuito). El trazado, coloreado por la velocidad
 * de cada tramo (marca.md §5, escala secuencial), y el cuadrado lima del logo que lo recorre con el ritmo de
 * la telemetría: frena donde frenó el coche. Al lado, un velocímetro con la cifra, el crono de la vuelta y
 * una barra de progreso.
 *
 * Se mueve con requestAnimationFrame y atributos SVG (no estilos en línea: CSP, D-04). Lo que se pinta en el
 * servidor es la figura entera, quieta en la línea de meta: sin JavaScript se ve igual, sin moverse. Con
 * movimiento reducido no arranca sola; se puede pausar siempre (WCAG 2.2.2) y se para fuera de pantalla.
 */
export function CircuitLap({
  layout,
  labels,
}: {
  layout: LapLayout;
  labels: { figure: string; play: string; pause: string; kmh: string; realTime: string; slow: string; fast: string };
}) {
  const { points, times, speeds, lapTime, corners } = layout;
  const n = points.length;
  const t0 = times[0] ?? 0;
  const synced = speeds.length === n && times.length === n && times.every((t, i) => i === 0 || t >= times[i - 1]!);

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 60;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  const path = `M${points.map((p) => p.join(",")).join("L")}Z`;
  const lo = speeds.length ? Math.min(...speeds) : 0;
  const hi = speeds.length ? Math.max(...speeds) : 1;
  const bucket = (v: number) => 1 + Math.min(BUCKETS - 1, Math.floor(((v - lo) / Math.max(1, hi - lo)) * BUCKETS));
  const [sx, sy] = points[0]!;
  const [nx, ny] = points[1] ?? points[0]!;
  const startAngle = (Math.atan2(ny - sy, nx - sx) * 180) / Math.PI;

  const root = useRef<HTMLElement>(null);
  const car = useRef<SVGGElement>(null);
  const trail = useRef<SVGPolylineElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const bar = useRef<SVGRectElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const visible = useRef(true);

  // Arranca sola salvo con movimiento reducido.
  useEffect(() => {
    if (!synced) return;
    setReady(true);
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [synced]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = Boolean(entry?.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !synced) return;
    // Momento de la vuelta (0…lapTime) → posición y velocidad, interpolando entre dos muestras.
    const rel = [...times.map((t) => t - t0), lapTime];
    const at = (s: number) => {
      const tt = ((s % lapTime) + lapTime) % lapTime;
      let i = 0;
      while (i < n - 1 && rel[i + 1]! <= tt) i++;
      const a = points[i]!;
      const b = points[(i + 1) % n]!;
      const span = Math.max(1e-6, rel[i + 1]! - rel[i]!);
      const k = Math.min(1, Math.max(0, (tt - rel[i]!) / span));
      const va = speeds[i]!;
      const vb = speeds[(i + 1) % n]!;
      return {
        x: a[0] + (b[0] - a[0]) * k,
        y: a[1] + (b[1] - a[1]) * k,
        angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
        v: va + (vb - va) * k,
        tt,
      };
    };
    let raf = 0;
    let last = performance.now();
    let elapsed = Number(root.current?.dataset.elapsed ?? 0);
    let shown = -1;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (visible.current) {
        elapsed += dt;
        const p = at(elapsed);
        car.current?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)})`);
        trail.current?.setAttribute(
          "points",
          [p, ...TRAIL.map((d) => at(elapsed - d))].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" "),
        );
        const kmh = Math.round(p.v);
        if (kmh !== shown && speed.current) {
          speed.current.textContent = String(kmh);
          shown = kmh;
        }
        if (time.current) time.current.textContent = clock(p.tt);
        bar.current?.setAttribute("width", `${((p.tt / lapTime) * 100).toFixed(2)}%`);
        if (root.current) root.current.dataset.elapsed = String(elapsed);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, synced, times, t0, lapTime, n, points, speeds]);

  return (
    <figure ref={root} className={`clap${ready ? " is-ready" : ""}${playing ? " is-playing" : ""}`}>
      <svg className="clap-svg" viewBox={`${minX} ${minY} ${w} ${h}`} role="img" aria-label={labels.figure}>
        <path d={path} className="clap-road" />
        <g className="clap-segs">
          {points.map((p, i) => {
            const q = points[(i + 1) % n]!;
            return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className={`lap-seg lap-seg-${bucket(speeds[i] ?? lo)}`} />;
          })}
        </g>
        {corners.map((c) => (
          <g key={c.n} className="clap-corner">
            <circle cx={c.point[0]} cy={c.point[1]} r={17} />
            <text x={c.point[0]} y={c.point[1]} dy="0.36em" textAnchor="middle">
              {c.n}
            </text>
          </g>
        ))}
        <line x1={sx} y1={sy - 30} x2={sx} y2={sy + 30} className="clap-finish" />
        <svg x={sx - 20} y={sy - 80} width="40" height="40" viewBox="0 0 24 24" className="lap-flag">
          <IconPaths name="flag" />
        </svg>
        <polyline ref={trail} className="clap-trail" points={`${sx},${sy}`} />
        <g ref={car} transform={`translate(${sx} ${sy}) rotate(${startAngle.toFixed(1)})`}>
          <rect className="clap-car" x={-15} y={-15} width={30} height={30} />
        </g>
      </svg>

      <figcaption className="clap-hud">
        {synced ? (
          <span className="clap-readout" aria-hidden="true">
            <span className="clap-speed">
              <span ref={speed} className="clap-speed-value">
                {Math.round(speeds[0] ?? 0)}
              </span>
              <span className="clap-speed-unit">{labels.kmh}</span>
            </span>
            <span className="clap-time">
              <span ref={time}>{clock(0)}</span>
              <span className="clap-time-total"> / {clock(lapTime)}</span>
            </span>
            <svg className="clap-progress" width="100%" height="4" focusable="false">
              <rect x="0" y="0" width="100%" height="4" className="clap-progress-rail" />
              <rect ref={bar} x="0" y="0" width="0%" height="4" className="clap-progress-fill" />
            </svg>
          </span>
        ) : null}
        <span className="clap-legend" aria-hidden="true">
          <span>{labels.slow}</span>
          <svg width="96" height="8" focusable="false">
            {Array.from({ length: BUCKETS }, (_, i) => (
              <rect key={i} x={`${i * 20}%`} y="0" width="20%" height="8" className={`clap-key lap-seg-${i + 1}`} />
            ))}
          </svg>
          <span>{labels.fast}</span>
        </span>
        {ready ? (
          <button type="button" className="clap-toggle" onClick={() => setPlaying((v) => !v)}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4 2.5v11L13 8z" />}
            </svg>
            <span>{playing ? labels.pause : labels.play}</span>
          </button>
        ) : null}
        {ready ? <span className="clap-live">{labels.realTime}</span> : null}
      </figcaption>
    </figure>
  );
}
