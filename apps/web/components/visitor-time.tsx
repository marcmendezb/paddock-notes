"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@paddock/shared";
import { localeOf } from "@/lib/format";

/**
 * Día y hora de una sesión en la zona del visitante («sáb 15:30»). En el servidor no se conoce: hasta
 * montar se pinta en UTC, con la misma forma, así que solo cambia el texto.
 */
export function VisitorTime({ iso, lang }: { iso: string; lang: Lang }) {
  const [zone, setZone] = useState("UTC");
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const text = new Intl.DateTimeFormat(localeOf(lang), {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  })
    .format(new Date(iso))
    .replace(/\./g, "");
  return (
    <time dateTime={iso} className="tabular" suppressHydrationWarning>
      {text}
    </time>
  );
}
