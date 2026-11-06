import { RESULT_GRACE_HOURS } from "./constants";
import type { RoundStatus, SessionKind } from "./api";

/** Duración estimada de una carrera para considerarla terminada (horas). */
const RACE_DURATION_HOURS = 2;

export interface RoundTiming {
  round: number;
  /** Inicio de la carrera en ISO UTC, o fecha (YYYY-MM-DD) si no hay hora. */
  startsAt: string | null;
  date: string;
  hasResult: boolean;
  cancelled: boolean;
}

/** Instante de salida; si la fuente no da hora, se toma el final del día UTC. */
export function raceStart(r: Pick<RoundTiming, "startsAt" | "date">): number {
  if (r.startsAt) return Date.parse(r.startsAt);
  return Date.parse(`${r.date}T23:59:59Z`);
}

/**
 * Estado de cada ronda (NUC-12), calculado con la hora UTC de la carrera.
 * "next" es la primera ronda no cancelada que aún no ha empezado.
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
 * La carrera terminó hace más de RESULT_GRACE_HOURS y no hay resultado: la ingesta va retrasada (D-06).
 */
export function isResultOverdue(r: RoundTiming, now: number): boolean {
  if (r.hasResult || r.cancelled) return false;
  const expected = raceStart(r) + (RACE_DURATION_HOURS + RESULT_GRACE_HOURS) * 3_600_000;
  return now > expected;
}

/** Une la fecha y la hora de Jolpica ("2026-03-08", "04:00:00Z") en ISO UTC. */
export function toIsoUtc(date: string, time: string | undefined): string | null {
  if (!time) return null;
  const t = time.endsWith("Z") ? time : `${time}Z`;
  const iso = `${date}T${t}`;
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}

/** Duración estimada de cada sesión, para el estado "en curso" (NUC-04) y el archivo .ics (NUC-16). */
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
