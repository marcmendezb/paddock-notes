import { describe, expect, it } from "vitest";
import { seasonIcs, type RaceSummary } from "../src";

const race: RaceSummary = {
  season: 2026,
  round: 20,
  name: "Brazilian Grand Prix",
  date: "2026-11-08",
  startsAt: "2026-11-08T17:00:00.000Z",
  isSprintWeekend: false,
  status: "next",
  winner: null,
  circuit: { id: "interlagos", name: "Autódromo José Carlos Pace", locality: "São Paulo", country: "Brazil", lat: -23.7036, lng: -46.6997 },
  sessions: [
    { kind: "qualifying", startsAt: "2026-11-07T18:00:00.000Z", date: "2026-11-07" },
    { kind: "race", startsAt: "2026-11-08T17:00:00.000Z", date: "2026-11-08" },
  ],
};

const labels = {
  calendarName: "Paddock Notes · F1 2026",
  session: { fp1: "Libres 1", fp2: "Libres 2", fp3: "Libres 3", sprint_qualifying: "Clasificación sprint", sprint: "Sprint", qualifying: "Clasificación", race: "Carrera" },
  raceName: () => "Gran Premio de Brasil",
  url: (s: number, r: number) => `https://paddocknotes.dev/es/races/${s}/${r}`,
};

describe("calendario .ics (NUC-16)", () => {
  const ics = seasonIcs([race], labels, "paddocknotes.dev", Date.parse("2026-11-05T00:00:00Z"));

  it("genera un evento por sesión con hora UTC y duración", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261108T170000Z");
    expect(ics).toContain("DTEND:20261108T190000Z");
    expect(ics).toContain("UID:2026-20-race@paddocknotes.dev");
  });

  it("usa CRLF, escapa comas y pliega líneas largas", () => {
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(ics).toContain("São Paulo\\, Brazil");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });

  it("omite las rondas canceladas", () => {
    expect(seasonIcs([{ ...race, status: "cancelled" }], labels, "x")).not.toContain("VEVENT");
  });
});
