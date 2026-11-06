import { describe, expect, it } from "vitest";
import { gapsToLeader, isResultOverdue, positionsGained, roundStatuses, toIsoUtc } from "../src";

const rounds = [
  { round: 1, date: "2026-03-08", startsAt: "2026-03-08T04:00:00.000Z", hasResult: true, cancelled: false },
  { round: 2, date: "2026-03-15", startsAt: "2026-03-15T07:00:00.000Z", hasResult: false, cancelled: true },
  { round: 3, date: "2026-03-29", startsAt: "2026-03-29T05:00:00.000Z", hasResult: false, cancelled: false },
  { round: 4, date: "2026-05-03", startsAt: "2026-05-03T20:00:00.000Z", hasResult: false, cancelled: false },
];

describe("estado de las rondas", () => {
  it("calcula disputada, cancelada, próxima y pendiente", () => {
    const now = Date.parse("2026-03-20T00:00:00Z");
    expect(Object.fromEntries(roundStatuses(rounds, now))).toEqual({
      1: "completed",
      2: "cancelled",
      3: "next",
      4: "upcoming",
    });
  });

  it("da la carrera por disputada desde la salida, aunque aún no haya resultado", () => {
    const now = Date.parse("2026-03-29T05:00:01Z");
    expect(roundStatuses(rounds, now).get(3)).toBe("completed");
    expect(roundStatuses(rounds, now).get(4)).toBe("next");
  });

  it("no hay próxima ronda al terminar la temporada", () => {
    const now = Date.parse("2026-12-31T00:00:00Z");
    expect([...roundStatuses(rounds, now).values()]).not.toContain("next");
  });
});

describe("retraso de la ingesta", () => {
  const r = rounds[2]!;
  it("no hay retraso durante las horas de margen", () => {
    expect(isResultOverdue(r, Date.parse("2026-03-29T12:00:00Z"))).toBe(false);
  });
  it("hay retraso pasadas carrera + margen", () => {
    expect(isResultOverdue(r, Date.parse("2026-03-29T13:01:00Z"))).toBe(true);
  });
});

describe("utilidades", () => {
  it("toIsoUtc acepta horas con y sin Z", () => {
    expect(toIsoUtc("2026-03-08", "04:00:00Z")).toBe("2026-03-08T04:00:00.000Z");
    expect(toIsoUtc("2026-03-08", "04:00:00")).toBe("2026-03-08T04:00:00.000Z");
    expect(toIsoUtc("1950-05-13", undefined)).toBeNull();
  });

  it("posiciones ganadas: sin valor desde boxes o sin clasificar", () => {
    expect(positionsGained(10, 3, "Finished")).toBe(7);
    expect(positionsGained(1, 4, "+1 Lap")).toBe(-3);
    expect(positionsGained(0, 8, "Finished")).toBeNull();
    expect(positionsGained(5, 18, "Engine")).toBeNull();
  });

  it("diferencia con el líder", () => {
    expect(gapsToLeader([380, 341, 0])).toEqual([0, 39, 380]);
  });
});

describe("nombres en español", () => {
  it("traduce los GP conocidos y deja el resto como dato", async () => {
    const { gpName, countryName, nationalityCountry } = await import("../src");
    expect(gpName("es", "Brazilian Grand Prix")).toBe("Gran Premio de Brasil");
    expect(gpName("es", "Mexico City Grand Prix")).toBe("Gran Premio de la Ciudad de México");
    expect(gpName("es", "Indianapolis 500")).toBe("500 Millas de Indianápolis");
    expect(gpName("es", "Bahrain Grand Prix in Malaysia")).toBe("Bahrain Grand Prix in Malaysia");
    expect(gpName("en", "Brazilian Grand Prix")).toBe("Brazilian Grand Prix");
    expect(countryName("es", "UK")).toBe("Reino Unido");
    expect(countryName("es", "Atlantis")).toBe("Atlantis");
    expect(nationalityCountry("es", "Monegasque")).toBe("Mónaco");
  });
});
