"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@paddock/shared";
import { formatDateTime, formatTime } from "@/lib/format";

interface Props {
  iso: string;
  lang: Lang;
  /** Zona horaria del circuito, si se conoce (NUC-03). */
  circuitTimeZone: string | null;
  circuitLabel: string;
}

/**
 * Hora de una sesión: la del visitante en primer plano y la del circuito en segundo (NUC-03).
 * En el servidor no se conoce la zona del visitante, así que la primera se pinta con la del circuito
 * (o UTC) y se sustituye al montar. Las dos partes existen desde el HTML: al hidratar solo cambia el
 * texto, nunca el número de líneas (sin desplazamientos de diseño).
 */
export function LocalTime({ iso, lang, circuitTimeZone, circuitLabel }: Props) {
  const [visitorZone, setVisitorZone] = useState<string | null>(null);

  useEffect(() => {
    setVisitorZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const primary = formatDateTime(lang, iso, visitorZone ?? circuitTimeZone ?? "UTC");

  return (
    <time dateTime={iso} className="local-time">
      <span className="tabular" suppressHydrationWarning>
        {primary}
        {!visitorZone && !circuitTimeZone ? " UTC" : ""}
      </span>
      {circuitTimeZone ? (
        <span className="muted">
          {" "}
          · {formatTime(lang, iso, circuitTimeZone)} {circuitLabel}
        </span>
      ) : null}
    </time>
  );
}
