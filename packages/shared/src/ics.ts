import type { RaceSummary, SessionKind } from "./api";
import { sessionDurationMs } from "./schedule";

/** A season's .ics calendar (NUC-16), following RFC 5545. */

export interface IcsLabels {
  calendarName: string;
  session: Record<SessionKind, string>;
  raceName: (name: string) => string;
  url: (season: number, round: number) => string;
}

/** Escapes a property's text: backslash, semicolon, comma and line breaks. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, without splitting UTF-8 characters. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function stamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function seasonIcs(races: RaceSummary[], labels: IcsLabels, domain: string, now = Date.now()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paddock Notes//F1 calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(labels.calendarName)}`,
  ];
  for (const race of races) {
    if (race.status === "cancelled") continue;
    for (const s of race.sessions) {
      if (!s.startsAt) continue;
      const start = Date.parse(s.startsAt);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${race.season}-${race.round}-${s.kind}@${domain}`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(start + sessionDurationMs(s.kind))}`,
        `SUMMARY:${escapeText(`${labels.raceName(race.name)} · ${labels.session[s.kind]}`)}`,
        `LOCATION:${escapeText(`${race.circuit.name}, ${race.circuit.locality}, ${race.circuit.country}`)}`,
        `URL:${labels.url(race.season, race.round)}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
