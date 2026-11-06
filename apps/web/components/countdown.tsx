"use client";

import { useEffect, useState } from "react";

interface Props {
  startsAt: string;
  /** Hora del servidor al renderizar: la cuenta atrás se pinta ya en el HTML (es el LCP de la home). */
  serverNow: number;
  units: { d: string; h: string; m: string; s: string };
  startedLabel: string;
}

/**
 * Cuenta atrás hasta la salida (NUC-02), dibujada como una cota: el hueco hasta la salida.
 * Se pinta en el servidor con su hora y el cliente la actualiza cada segundo. Los dígitos pueden diferir
 * en un segundo al hidratar: solo ellos llevan suppressHydrationWarning. Van con aria-hidden; el texto
 * accesible es la frase estática que la acompaña.
 */
export function Countdown({ startsAt, serverNow, units, startedLabel }: Props) {
  const [now, setNow] = useState<number>(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Date.parse(startsAt) - now);
  if (remaining === 0) return <p className="countdown-done">{startedLabel}</p>;

  const s = Math.floor(remaining / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), units.d],
    [Math.floor((s % 86400) / 3600), units.h],
    [Math.floor((s % 3600) / 60), units.m],
    [s % 60, units.s],
  ];

  return (
    <div className="countdown" aria-hidden="true">
      <div className="cota" />
      <dl className="countdown-values">
        {parts.map(([value, unit]) => (
          <div key={unit} className="countdown-part">
            <dt className="countdown-unit">{unit}</dt>
            <dd className="countdown-value" suppressHydrationWarning>
              {String(value).padStart(2, "0")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
