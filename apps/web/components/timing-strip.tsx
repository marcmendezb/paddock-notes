"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSessionLive, sessionDurationMs, type Lang, type ScheduleSession, type SessionKind } from "@paddock/shared";
import { localeOf } from "@/lib/format";

export interface StripLabels {
  next: string;
  live: string;
  /** The events after the next one. */
  later: string;
  sessions: Record<SessionKind, string>;
  /** With "{in}" where the time left goes. */
  inText: string;
  units: { d: string; h: string; m: string };
}

export interface TickerItem {
  key: string;
  label: string;
  text: string;
  href: string;
}

/** An upcoming Grand Prix: its sessions, if we know them, or just its start. */
export interface TickerRace {
  href: string;
  gp: string;
  startsAt: string | null;
  sessions: ScheduleSession[];
}

const TEN_MINUTES = 10 * 60_000;

function until(ms: number, u: StripLabels["units"]) {
  const m = Math.max(1, Math.round(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d} ${u.d} ${h} ${u.h}`;
  if (h > 0) return `${h} ${u.h} ${m % 60} ${u.m}`;
  return `${m} ${u.m}`;
}

interface Event {
  key: string;
  live: boolean;
  label: string;
  text: string;
  when: string;
  inText: string | null;
  href: string;
}

/**
 * The timing strip at the top of every page, like a broadcast's. On the left, fixed, what is live (with the
 * logo's square pulsing) or, if nothing is, the next event; beside it the rest scrolls past, alternating
 * fact and event: fact, event, fact, event… The events are the remaining sessions of the next Grand Prix and
 * the following Grands Prix. It recomputes itself every 30 s and fetches the data again every 10 minutes.
 *
 * It always scrolls, by the author's decision; with "reduce motion" in the system, it stays still.
 */
export function TimingStrip({
  races,
  items,
  serverNow,
  labels,
  lang,
}: {
  lang: Lang;
  races: TickerRace[];
  items: TickerItem[];
  serverNow: number;
  labels: StripLabels;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  // The visitor's time zone: unknown on the server; until mounting, times show in UTC.
  const [zone, setZone] = useState("UTC");
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const refresh = setInterval(() => router.refresh(), TEN_MINUTES);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  const format = (iso: string) =>
    new Intl.DateTimeFormat(localeOf(lang), {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone,
    })
      .format(new Date(iso))
      .replace(/\./g, "");

  // Events: every session that has not finished (live or upcoming) and, for Grands Prix without sessions, the start.
  const events: Event[] = [];
  for (const race of races) {
    const timed = race.sessions.filter((s): s is ScheduleSession & { startsAt: string } => s.startsAt !== null);
    const pending = timed.filter((s) => Date.parse(s.startsAt) + sessionDurationMs(s.kind) > now);
    if (pending.length) {
      for (const s of pending) {
        const live = isSessionLive(s, now);
        events.push({
          key: `${race.href}-${s.kind}`,
          live,
          label: live ? labels.live : labels.next,
          text: `${labels.sessions[s.kind]} · ${race.gp}`,
          when: live ? "" : format(s.startsAt),
          inText: live ? null : labels.inText.replace("{in}", until(Date.parse(s.startsAt) - now, labels.units)),
          href: race.href,
        });
      }
    } else if (race.startsAt && Date.parse(race.startsAt) > now) {
      events.push({
        key: race.href,
        live: false,
        label: labels.next,
        text: race.gp,
        when: format(race.startsAt),
        inText: labels.inText.replace("{in}", until(Date.parse(race.startsAt) - now, labels.units)),
        href: race.href,
      });
    }
  }
  // Whatever is live always goes first. Only the first upcoming event is "Next"; the others,
  // "Later".
  events.sort((a, b) => Number(b.live) - Number(a.live));
  let firstUpcoming = true;
  for (const e of events) {
    if (e.live) continue;
    e.label = firstUpcoming ? labels.next : labels.later;
    firstUpcoming = false;
  }

  // The first one (live or next) is fixed on the left and does not scroll; the rest pass beside it:
  // fact, event, fact, event… until both run out.
  const [lead, ...rest] = events;
  type Entry = { kind: "event"; event: Event } | { kind: "data"; item: TickerItem };
  const sequence: Entry[] = [];
  for (let i = 0; i < Math.max(rest.length, items.length); i++) {
    if (items[i]) sequence.push({ kind: "data", item: items[i]! });
    if (rest[i]) sequence.push({ kind: "event", event: rest[i]! });
  }
  if (!lead && sequence.length === 0) return null;

  const content = (hidden: boolean) => (
    <ul className="ticker-group" aria-hidden={hidden || undefined}>
      {sequence.map((entry) =>
        entry.kind === "event" ? (
          <li key={entry.event.key} className={entry.event.live ? "ticker-item ticker-event is-live" : "ticker-item ticker-event"}>
            <Link href={entry.event.href} tabIndex={hidden ? -1 : undefined}>
              <span className="ticker-mark" aria-hidden="true" />
              <span className="ticker-label">{entry.event.label}</span>
              <span className="ticker-text">{entry.event.text}</span>
              {entry.event.when ? (
                <span className="ticker-when" suppressHydrationWarning>
                  {entry.event.when}
                </span>
              ) : null}
              {entry.event.inText ? (
                <span className="ticker-in" suppressHydrationWarning>
                  {entry.event.inText}
                </span>
              ) : null}
            </Link>
          </li>
        ) : (
          <li key={entry.item.key} className="ticker-item">
            <Link href={entry.item.href} tabIndex={hidden ? -1 : undefined}>
              <span className="ticker-label ticker-label-data">{entry.item.label}</span>
              <span className="ticker-text">{entry.item.text}</span>
            </Link>
          </li>
        ),
      )}
    </ul>
  );

  return (
    <div className="ticker">
      {lead ? (
        <Link href={lead.href} className={lead.live ? "ticker-lead is-live" : "ticker-lead"}>
          <span className="ticker-mark" aria-hidden="true" />
          <span className="ticker-label">{lead.label}</span>
          <span className="ticker-text">{lead.text}</span>
          {lead.when ? (
            <span className="ticker-when" suppressHydrationWarning>
              {lead.when}
            </span>
          ) : null}
          {lead.inText ? (
            <span className="ticker-in" suppressHydrationWarning>
              {lead.inText}
            </span>
          ) : null}
        </Link>
      ) : null}
      <div className="ticker-viewport">
        <div className="ticker-track">
          {content(false)}
          {content(true)}
        </div>
      </div>
    </div>
  );
}
