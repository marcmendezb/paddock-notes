"use client";

import { useEffect, useState } from "react";

/** A time zone's offset from UTC in minutes at an instant ("GMT-06:00" → -360). */
function zoneOffset(timeZone: string, at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * The difference between the circuit's time and the viewer's ("+7 h from your time"). Only known in the
 * browser: the server paints a dash and it is completed on mount. `template` carries "{h}" where the
 * difference goes (a function cannot be passed from the server to the client).
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
