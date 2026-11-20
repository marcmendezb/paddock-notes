"use client";

import { useEffect, useState } from "react";
import { isSessionLive, sessionDurationMs, type Lang, type ScheduleSession, type SessionKind } from "@paddock/shared";
import { IconPaths, SESSION_ICON } from "./icons";
import { localeOf } from "@/lib/format";

/**
 * The weekend as a calendar (NUC-03, NUC-04): one column per day and the hours running down, in the
 * visitor's time zone. Each session is a block at its time and with its real duration, with its pictogram;
 * the next one is marked in lime, the live one pulses and the race is in white. A line marks "now" in
 * today's column.
 *
 * SVG with attributes (position and height per hour): no inline styles (CSP, D-04). It is painted on the
 * server in the circuit's time and switches to the visitor's on mount. Decorative for screen readers:
 * the accessible list of times comes right after it.
 */

type State = "done" | "live" | "next" | "upcoming";

export interface CalendarLabels {
  sessions: Record<SessionKind, string>;
  /** Short names for narrow columns (mobile). */
  short: Record<SessionKind, string>;
  circuitTime: string;
  now: string;
  live: string;
  next: string;
}

const locale = localeOf;
const AXIS = 9; // % of the width for the hours column
const HEADER = 64;
const MIN_BLOCK = 86;

function parts(lang: Lang, iso: string, timeZone: string) {
  const p = new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(new Date(iso));
  const month = new Intl.DateTimeFormat(locale(lang), { month: "short", timeZone }).format(new Date(iso)).replace(".", "");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    key,
    weekday: get("weekday").replace(".", ""),
    day: get("day"),
    month,
    minutes: hour * 60 + minute,
    hm: `${get("hour")}:${get("minute")}`,
  };
}

export function WeekendCalendar({
  lang,
  sessions,
  circuitTimeZone,
  serverNow,
  labels,
}: {
  lang: Lang;
  sessions: ScheduleSession[];
  circuitTimeZone: string | null;
  serverNow: number;
  labels: CalendarLabels;
}) {
  const [now, setNow] = useState(serverNow);
  const [visitorZone, setVisitorZone] = useState<string | null>(null);
  useEffect(() => {
    setVisitorZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const trackZone = circuitTimeZone ?? "UTC";
  const zone = visitorZone ?? trackZone;
  const timed = sessions.filter((s): s is ScheduleSession & { startsAt: string } => s.startsAt !== null);
  if (timed.length === 0) return null;

  const nextKind = timed.find((s) => Date.parse(s.startsAt) > now && !isSessionLive(s, now))?.kind;
  const stateOf = (s: (typeof timed)[number]): State =>
    isSessionLive(s, now)
      ? "live"
      : Date.parse(s.startsAt) + sessionDurationMs(s.kind) <= now
        ? "done"
        : s.kind === nextKind
          ? "next"
          : "upcoming";

  const items = timed.map((s) => {
    const p = parts(lang, s.startsAt, zone);
    const duration = sessionDurationMs(s.kind) / 60_000;
    const end = parts(lang, new Date(Date.parse(s.startsAt) + sessionDurationMs(s.kind)).toISOString(), zone).hm;
    return { s, p, end, duration, track: parts(lang, s.startsAt, trackZone).hm, state: stateOf(s) };
  });
  const days: { key: string; weekday: string; day: string; month: string }[] = [];
  for (const it of items) {
    if (!days.some((d) => d.key === it.p.key)) days.push({ key: it.p.key, weekday: it.p.weekday, day: it.p.day, month: it.p.month });
  }

  const firstHour = Math.max(0, Math.floor(Math.min(...items.map((i) => i.p.minutes)) / 60) - 1);
  const lastHour = Math.min(24, Math.ceil(Math.max(...items.map((i) => i.p.minutes + i.duration)) / 60) + 1);
  const hours = Math.max(1, lastHour - firstHour);
  const pph = Math.max(34, Math.min(56, 560 / hours));
  const height = HEADER + hours * pph + 12;
  const y = (minutes: number) => HEADER + ((minutes - firstHour * 60) / 60) * pph;
  const colW = (100 - AXIS) / days.length;
  const colX = (i: number) => AXIS + i * colW;
  const pct = (v: number) => `${v.toFixed(3)}%`;
  const label = (n: number) => `${String(n).padStart(2, "0")}:00`;

  const nowParts = parts(lang, new Date(now).toISOString(), zone);
  const today = days.findIndex((d) => d.key === nowParts.key);
  const showNow = today >= 0 && nowParts.minutes >= firstHour * 60 && nowParts.minutes <= lastHour * 60;

  return (
    <svg className="cal" width="100%" height={height} aria-hidden="true" focusable="false">
      {/* Today: the column gets a barely marked background. */}
      {today >= 0 ? (
        <rect className="cal-today-bg" x={pct(colX(today))} y="0" width={pct(colW)} height={height} />
      ) : null}
      {/* Half hours, dotted. */}
      {Array.from({ length: hours }, (_, i) => firstHour + i).map((h) => (
        <line key={`half-${h}`} className="cal-half" x1={pct(AXIS)} x2="100%" y1={y(h * 60 + 30)} y2={y(h * 60 + 30)} />
      ))}
      {/* Hours: one line per hour and its label in the left column. */}
      {Array.from({ length: hours + 1 }, (_, i) => firstHour + i).map((h) => (
        <g key={h} className="cal-hour">
          <line x1={pct(AXIS)} x2="100%" y1={y(h * 60)} y2={y(h * 60)} />
          {h < lastHour ? (
            <text x="0" y={y(h * 60) + 4}>
              {label(h)}
            </text>
          ) : null}
        </g>
      ))}

      {days.map((d, i) => (
        <g key={d.key} className={i === today ? "cal-day cal-today" : "cal-day"}>
          <line className="cal-day-rule" x1={pct(colX(i) + 0.6)} x2={pct(colX(i) + colW - 0.6)} y1="3" y2="3" />
          <text className="cal-day-name" x={pct(colX(i) + 0.6)} y="26">
            {d.weekday}
          </text>
          <text className="cal-day-number" x={pct(colX(i) + 0.6)} y="54">
            {d.day}
            <tspan className="cal-day-month" dx="6">
              {d.month}
            </tspan>
          </text>
        </g>
      ))}

      {items.map(({ s, p, end, duration, track, state }) => {
        const col = days.findIndex((d) => d.key === p.key);
        const top = y(p.minutes);
        const h = Math.max(MIN_BLOCK, (duration / 60) * pph);
        return (
          <svg
            key={s.kind}
            className={`cal-block cal-${state}${s.kind === "race" ? " cal-race" : ""}`}
            x={pct(colX(col) + 0.6)}
            y={top}
            width={pct(colW - 1.2)}
            height={h}
            overflow="hidden"
          >
            <rect className="cal-block-bg" x="1" y="1" width="100%" height={h - 2} />
            <svg x="10" y="10" width="18" height="18" viewBox="0 0 24 24" className="cal-icon">
              <IconPaths name={SESSION_ICON[s.kind]} />
            </svg>
            <text className="cal-block-name" x="36" y="24">
              {labels.sessions[s.kind]}
            </text>
            <text className="cal-block-name cal-block-name-short" x="34" y="24">
              {labels.short[s.kind]}
            </text>
            {state === "live" || state === "next" ? (
              <text className="cal-block-state" x="100%" dx={state === "live" ? -24 : -10} y="24" textAnchor="end">
                {state === "live" ? labels.live : labels.next}
              </text>
            ) : null}
            <text className="cal-block-time" x="10" y="54">
              {p.hm}
              <tspan className="cal-block-end">–{end}</tspan>
            </text>
            {circuitTimeZone ? (
              <>
                <svg x="9" y="62" width="13" height="13" viewBox="0 0 24 24" className="cal-icon cal-icon-small">
                  <IconPaths name="pin" />
                </svg>
                <text className="cal-block-track" x="26" y="73">
                  {track}
                  <tspan className="cal-block-track-label"> {labels.circuitTime}</tspan>
                </text>
              </>
            ) : null}
            {state === "live" ? <rect className="cal-live-mark" x="100%" y="10" width="8" height="8" transform="translate(-18 6)" /> : null}
          </svg>
        );
      })}

      {showNow ? (
        <g className="cal-now">
          <line x1={pct(colX(today))} x2={pct(colX(today) + colW)} y1={y(nowParts.minutes)} y2={y(nowParts.minutes)} />
          <rect x={pct(colX(today))} y={y(nowParts.minutes) - 4} width="8" height="8" />
          <text x={pct(colX(today) + colW - 0.6)} y={y(nowParts.minutes) - 8} textAnchor="end">
            {labels.now}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
