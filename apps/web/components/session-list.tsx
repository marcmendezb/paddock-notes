"use client";

import { useEffect, useState } from "react";
import { isSessionLive, type Lang, type ScheduleSession } from "@paddock/shared";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { LocalTime } from "./local-time";

/**
 * The weekend's times (NUC-03) with the live session highlighted (NUC-04).
 * The "live" state is computed on the client, on mount, to avoid hydration errors.
 */
export function SessionList({
  lang,
  sessions,
  circuitTimeZone,
}: {
  lang: Lang;
  sessions: ScheduleSession[];
  circuitTimeZone: string | null;
}) {
  const t = dict(lang);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <ul className="sessions">
      {sessions.map((s) => {
        const live = now !== null && isSessionLive(s, now);
        return (
          <li key={s.kind} data-live={live || undefined}>
            <span className="session-name">
              {t.sessions[s.kind]}
              {live ? <span className="tag tag-accent">{t.home.live}</span> : null}
            </span>
            {s.startsAt ? (
              <LocalTime iso={s.startsAt} lang={lang} circuitTimeZone={circuitTimeZone} circuitLabel={t.home.circuitTime} />
            ) : (
              <span className="tabular">{formatDate(lang, s.date)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
