import { describe, expect, it } from "vitest";
import { newsletterEmail, raceNoticeEmail, suggestedExplainer, unsubscribeHeaders, type RaceDigest } from "../src";

describe("suggested explainer (NUC-09)", () => {
  it("sprint takes precedence over circuit type", () => {
    expect(suggestedExplainer("monza", true, "es").explainer.slug).toBe("sprint");
  });
  it("each known circuit has its explainer and reason", () => {
    expect(suggestedExplainer("monaco", false, "es")).toMatchObject({ explainer: { slug: "qualifying" }, reason: expect.stringMatching(/adelantar/) });
    expect(suggestedExplainer("marina_bay", false, "en").explainer.slug).toBe("safety-car");
  });
  it("unclassified circuit defaults to guide", () => {
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
  note: { slug: "2026-mexico", title: { es: "Una parada en la vuelta 43 cambió México", en: "A lap-43 stop changed Mexico", de: "Ein Stopp in Runde 43 hat Mexiko entschieden" } },
  history: null,
  next: { season: 2026, round: 20, gp: "São Paulo Grand Prix", circuitId: "interlagos", isSprintWeekend: false, raceStart: "2026-11-08T17:00:00Z" },
};

describe("newsletter (CON-06, content.md §5.5)", () => {
  const email = newsletterEmail("es", digest, "https://paddocknotes.dev", "https://paddocknotes.dev/es/newsletter/unsubscribe?token=t", "");

  it("subject with key takeaway under 60 characters", () => {
    expect(email.subject).toBe("Max Verstappen gana el Gran Premio de la Ciudad de México");
    expect(email.subject.length).toBeLessThan(60);
  });

  it("race recap in 5 lines max, championship before fastest lap", () => {
    const block = email.text.split("\n\n")[0]!.split("\n");
    expect(block.slice(1, -1)).toHaveLength(5);
    expect(block.join("\n")).toContain("En el Mundial manda Andrea Kimi Antonelli");
    expect(block.join("\n")).not.toContain("Vuelta rápida");
  });

  it("links race note when published (CON-04)", () => {
    expect(email.text).toContain("LA NOTA DE LA CARRERA\nUna parada en la vuelta 43 cambió México\nhttps://paddocknotes.dev/es/notes/2026-mexico");
  });

  it("next event in subscriber timezone with unsubscribe link and disclaimer", () => {
    expect(email.text).toContain("Domingo, 8 de noviembre, 18:00 CET");
    expect(email.text).toContain("Darte de baja en un clic: https://paddocknotes.dev/es/newsletter/unsubscribe?token=t");
    expect(email.text).toContain("no oficial");
  });
});

describe("notifications (COM-11)", () => {
  it("GP notification with session schedule in subscriber timezone", () => {
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

  it("one-click unsubscribe headers (RFC 8058)", () => {
    expect(unsubscribeHeaders("https://x/u/1")).toEqual({ "List-Unsubscribe": "<https://x/u/1>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  });
});
