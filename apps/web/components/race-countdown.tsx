"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta atrás de la cabecera de carrera: días, horas y minutos hasta la salida, viva (cada 30 s). En
 * cuanto empieza, «En directo»; dos horas después, nada. En el servidor se pinta con la hora de la petición.
 */
export function RaceCountdown({
  startsAt,
  serverNow,
  units,
  live,
  label,
}: {
  startsAt: string;
  serverNow: number;
  units: { d: string; h: string; m: string };
  live: string;
  label: string;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const start = Date.parse(startsAt);
  const left = start - now;
  if (left <= 0) {
    return now - start < 2 * 3_600_000 ? (
      <p className="rv-live">
        <span className="rv-live-mark" aria-hidden="true" />
        {live}
      </p>
    ) : null;
  }
  const m = Math.floor(left / 60_000);
  const parts: [number, string][] = [
    [Math.floor(m / 1440), units.d],
    [Math.floor((m % 1440) / 60), units.h],
    [m % 60, units.m],
  ];
  return (
    <div className="rv-count" role="timer" aria-label={label}>
      <p className="rv-count-label">{label}</p>
      <p className="rv-count-digits">
        {parts.map(([value, unit], i) =>
          i === 0 && value === 0 ? null : (
            <span key={unit} className="rv-count-part">
              <span className="rv-count-value tabular" suppressHydrationWarning>
                {String(value).padStart(i === 0 ? 1 : 2, "0")}
              </span>
              <span className="rv-count-unit">{unit}</span>
            </span>
          ),
        )}
      </p>
    </div>
  );
}
