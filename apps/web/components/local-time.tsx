"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@paddock/shared";
import { formatDateTime, formatTime } from "@/lib/format";

interface Props {
  iso: string;
  lang: Lang;
  /** The circuit's time zone, if known (NUC-03). */
  circuitTimeZone: string | null;
  circuitLabel: string;
  /** Both times on separate lines (title block and the hero's columns), without the "·" separator. */
  stacked?: boolean;
}

/**
 * A session's time: the visitor's in the foreground and the circuit's second (NUC-03).
 * On the server the visitor's time zone is unknown, so the first is painted with the circuit's (or UTC)
 * and replaced on mount. Both parts exist from the HTML: on hydration only the text changes, never the
 * number of lines (no layout shift).
 */
export function LocalTime({ iso, lang, circuitTimeZone, circuitLabel, stacked = false }: Props) {
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
        <span className={stacked ? "muted block" : "muted"}>
          {stacked ? "" : " · "}
          {formatTime(lang, iso, circuitTimeZone)} {circuitLabel}
        </span>
      ) : null}
    </time>
  );
}
