import { RESULT_GRACE_HOURS } from "./constants";
import type { RoundStatus, SessionKind } from "./api";

/** A race's estimated duration for it to count as finished (hours). */
const RACE_DURATION_HOURS = 2;

export interface RoundTiming {
  round: number;
  /** Race start in ISO UTC, or the date (YYYY-MM-DD) if there is no time. */
  startsAt: string | null;
  date: string;
  hasResult: boolean;
  cancelled: boolean;
}

/** Start instant; if the source gives no time, the end of the UTC day is used. */
export function raceStart(r: Pick<RoundTiming, "startsAt" | "date">): number {
  if (r.startsAt) return Date.parse(r.startsAt);
  return Date.parse(`${r.date}T23:59:59Z`);
}

/**
 * Each round's state (NUC-12), computed from the race's UTC time.
 * "next" is the first non-cancelled round that has not started yet.
 */
export function roundStatuses(rounds: RoundTiming[], now: number): Map<number, RoundStatus> {
  const sorted = [...rounds].sort((a, b) => a.round - b.round);
  const statuses = new Map<number, RoundStatus>();
  let nextAssigned = false;
  for (const r of sorted) {
    if (r.cancelled) {
      statuses.set(r.round, "cancelled");
    } else if (r.hasResult || raceStart(r) <= now) {
      statuses.set(r.round, "completed");
    } else if (!nextAssigned) {
      statuses.set(r.round, "next");
      nextAssigned = true;
    } else {
      statuses.set(r.round, "upcoming");
    }
  }
  return statuses;
}

/**
 * The race ended more than RESULT_GRACE_HOURS ago and there is no result: ingestion is behind (D-06).
 */
export function isResultOverdue(r: RoundTiming, now: number): boolean {
  if (r.hasResult || r.cancelled) return false;
  const expected = raceStart(r) + (RACE_DURATION_HOURS + RESULT_GRACE_HOURS) * 3_600_000;
  return now > expected;
}

/** Joins Jolpica's date and time ("2026-03-08", "04:00:00Z") into ISO UTC. */
export function toIsoUtc(date: string, time: string | undefined): string | null {
  if (!time) return null;
  const t = time.endsWith("Z") ? time : `${time}Z`;
  const iso = `${date}T${t}`;
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}

/** Each session's estimated duration, for the "live" state (NUC-04) and the .ics file (NUC-16). */
const SESSION_MINUTES: Record<SessionKind, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprint_qualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
};

export function sessionDurationMs(kind: SessionKind): number {
  return SESSION_MINUTES[kind] * 60_000;
}

export function isSessionLive(s: { kind: SessionKind; startsAt: string | null }, now: number): boolean {
  if (!s.startsAt) return false;
  const start = Date.parse(s.startsAt);
  return now >= start && now < start + sessionDurationMs(s.kind);
}
