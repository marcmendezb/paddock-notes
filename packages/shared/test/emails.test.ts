import { describe, expect, it } from "vitest";
import { newsletterEmail, raceNoticeEmail, suggestedExplainer, unsubscribeHeaders, type RaceDigest } from "../src";

describe("explicador sugerido (NUC-09)", () => {
  it("el sprint manda sobre el tipo de circuito", () => {
    expect(suggestedExplainer("monza", true, "es").explainer.slug).toBe("sprint");
  });
  it("cada circuito conocido tiene su explicador y su razón", () => {
    expect(suggestedExplainer("monaco", false, "es")).toMatchObject({ explainer: { slug: "qualifying" }, reason: expect.stringMatching(/adelantar/) });
    expect(suggestedExplainer("marina_bay", false, "en").explainer.slug).toBe("safety-car");
  });
  it("un circuito sin clasificar lleva a la guía", () => {
    expect(suggestedExplainer("nuevo", false, "es").explainer.slug).toBe("guide");
  });
});

const digest: RaceDigest = {
  season: 2026,
  round: 19,
  gp: "Mexico City Grand Prix",
  podium: [
    { name: "Max Verstappen", team: "Red Bull", gained: 4 },
    { name: "Lewis Hamilton", team: "Ferrari", gained: -1 },
    { name: "Andrea Kimi Antonelli", team: "Mercedes", gained: 0 },
  ],
  pole: "Lewis Hamilton",
  fastestLap: { name: "Lewis Hamilton", time: "1:19.268" },
  biggestGain: { name: "Liam Lawson", gained: 15, finish: 7 },
  leader: { name: "Andrea Kimi Antonelli", points: 380, gap: 119 },
  hasAnalysis: true,
  history: null,
  next: { season: 2026, round: 20, gp: "São Paulo Grand Prix", circuitId: "interlagos", isSprintWeekend: false, raceStart: "2026-11-08T17:00:00Z" },
};

describe("newsletter (CON-06, contenido.md §5.5)", () => {
  const email = newsletterEmail("es", digest, "https://paddocknotes.dev", "https://paddocknotes.dev/es/newsletter/unsubscribe?token=t", "");

  it("asunto con el hallazgo en menos de 60 caracteres", () => {
    expect(email.subject).toBe("Max Verstappen gana el Gran Premio de la Ciudad de México");
    expect(email.subject.length).toBeLessThan(60);
  });

  it("la carrera en 5 líneas como máximo, con el Mundial antes que la vuelta rápida", () => {
    const block = email.text.split("\n\n")[0]!.split("\n");
    expect(block.slice(1, -1)).toHaveLength(5);
    expect(block.join("\n")).toContain("En el Mundial manda Andrea Kimi Antonelli");
    expect(block.join("\n")).not.toContain("Vuelta rápida");
  });

  it("próxima cita en la hora de la lista y pie con baja y aviso de no afiliación", () => {
    expect(email.text).toContain("Domingo, 8 de noviembre, 18:00 CET");
    expect(email.text).toContain("Darte de baja en un clic: https://paddocknotes.dev/es/newsletter/unsubscribe?token=t");
    expect(email.text).toContain("no oficial");
  });
});

describe("avisos (COM-11)", () => {
  it("aviso de GP con los horarios en la zona de la lista", () => {
    const email = raceNoticeEmail(
      "en",
      { season: 2026, round: 20, gp: "São Paulo Grand Prix", sessions: [{ kind: "fp1", startsAt: "2026-11-06T14:30:00Z" }, { kind: "race", startsAt: null }] },
      "https://paddocknotes.dev",
      "https://u",
      "Calle 1, Barcelona",
    );
    expect(email.subject).toBe("This weekend: São Paulo Grand Prix");
    expect(email.text).toContain("Practice 1: Friday 6 November at 14:30 GMT");
    expect(email.text).not.toContain("Race:");
    expect(email.text.trim().endsWith("Calle 1, Barcelona")).toBe(true);
  });

  it("cabeceras de baja en un clic (RFC 8058)", () => {
    expect(unsubscribeHeaders("https://x/u/1")).toEqual({ "List-Unsubscribe": "<https://x/u/1>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  });
});
