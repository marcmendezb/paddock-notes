"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@paddock/shared";
import { localeOf } from "@/lib/format";

/** Hora local de un sitio, en vivo (cada 20 s). En el servidor no se pinta la hora: se evita un salto. */
export function LocalClock({ lang, timeZone }: { lang: Lang; timeZone: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className="tabular">—</span>;
  const text = new Intl.DateTimeFormat(localeOf(lang), {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  })
    .format(now)
    .replace(/\./g, "");
  return <span className="tabular">{text}</span>;
}
