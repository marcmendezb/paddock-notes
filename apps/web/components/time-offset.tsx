"use client";

import { useEffect, useState } from "react";

/** Minutos de diferencia con UTC de una zona horaria en un instante («GMT-06:00» → -360). */
function zoneOffset(timeZone: string, at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Diferencia entre la hora del circuito y la de quien lo mira («+7 h respecto a tu hora»). Solo se sabe en
 * el navegador: en el servidor se pinta una raya y se completa al montar. `template` lleva «{h}» donde va la
 * diferencia (una función no puede pasar del servidor al cliente).
 */
export function TimeOffset({ timeZone, same, template }: { timeZone: string; same: string; template: string }) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    const now = new Date();
    setDiff(zoneOffset(timeZone, now) + now.getTimezoneOffset());
  }, [timeZone]);
  if (diff === null) return <span className="tabular">—</span>;
  if (diff === 0) return <span>{same}</span>;
  const h = Math.trunc(Math.abs(diff) / 60);
  const m = Math.abs(diff) % 60;
  const value = `${diff > 0 ? "+" : "−"}${h}${m ? `:${String(m).padStart(2, "0")}` : ""} h`;
  return <span className="tabular">{template.replace("{h}", value)}</span>;
}
