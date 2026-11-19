"use client";

import { useEffect, useState } from "react";

interface Props {
  startsAt: string;
  /** Salida del GP anterior: origen de la cota. Sin él, la cota mide las dos últimas semanas. */
  fromIso: string | null;
  /** Hora del servidor al renderizar: la cuenta atrás se pinta ya en el HTML (es el LCP de la home). */
  serverNow: number;
  units: { d: string; h: string; m: string; s: string };
  startedLabel: string;
  labels: { from: string; now: string; to: string };
  /** Rótulo de la cota («Hasta la salida»), a la izquierda de las cifras. Visible; el texto accesible va aparte. */
  caption?: string;
}

const TWO_WEEKS = 14 * 86_400_000;
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * Cuenta atrás como cota a escala (NUC-02, marca.md §1): una línea de medida que va de la salida del GP
 * anterior a la de este. Lo recorrido queda en discontinua; lo que falta, en lima, con su valor escrito
 * encima. Todo con atributos en porcentaje dentro del SVG: sin estilos en línea (CSP, D-04).
 * Se pinta en el servidor con su hora y el cliente la actualiza cada segundo; los números y la cota van
 * con aria-hidden: el texto accesible es la frase estática que la acompaña.
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
              {/* La clave cambia con el valor: cada cifra nueva entra con su animación. */}
              <span key={value} className="countdown-digit">
                {String(value).padStart(2, "0")}
              </span>
            </dd>
          </div>
        ))}
        </dl>
      </div>
      <svg className="cota-scale" width="100%" height="72" focusable="false">
        {/* Lo recorrido desde el GP anterior: referencia, en discontinua. */}
        <line className="cota-elapsed" x1="0%" x2={pct(ratio)} y1="32" y2="32" />
        {/* Lo que falta: la cota, en lima, con remates en los dos extremos. */}
        <line className="cota-remaining" x1={pct(ratio)} x2="100%" y1="32" y2="32" pathLength={1} />
        <line className="cota-tick cota-tick-from" x1="1" x2="1" y1="22" y2="42" />
        <line className="cota-tick cota-tick-now" x1={pct(ratio)} x2={pct(ratio)} y1="16" y2="48" />
        <line className="cota-tick cota-tick-to" x1="99.85%" x2="99.85%" y1="22" y2="42" />
        {/* «Ahora», encima de la línea: nunca choca con las etiquetas de los extremos, que van debajo. */}
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
