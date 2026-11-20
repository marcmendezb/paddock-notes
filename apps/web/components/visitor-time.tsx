"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@paddock/shared";
import { localeOf } from "@/lib/format";

/**
 * A session's day and time in the visitor's time zone ("Sat 15:30"). Unknown on the server: until mount it
 * is painted in UTC, in the same shape, so only the text changes.
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
