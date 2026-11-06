import { describe, expect, it } from "vitest";
import { predictionDeadline, rankUsers, scorePrediction, validateName, validPicks } from "../src";

describe("puntuación de predicciones (COM-05)", () => {
  const podium = ["ver", "ham", "ant"];
  it("puntúa podio exacto, podio en otra posición y pole", () => {
    expect(scorePrediction({ p1: "ver", p2: "ham", p3: "ant", pole: "ham" }, podium, "ham")).toEqual({ points: 18, exact: 3, podium: 0, pole: true });
    expect(scorePrediction({ p1: "ham", p2: "ver", p3: "nor", pole: "ver" }, podium, "ham")).toEqual({ points: 4, exact: 0, podium: 2, pole: false });
    expect(scorePrediction({ p1: "nor", p2: "pia", p3: "rus", pole: "lec" }, podium, null).points).toBe(0);
  });
});

describe("cierre de predicciones (COM-04)", () => {
  it("cierra con la primera sesión competitiva", () => {
    expect(
      predictionDeadline([
        { kind: "fp1", startsAt: "2026-11-06T14:30:00.000Z", date: "2026-11-06" },
        { kind: "sprint_qualifying", startsAt: "2026-11-06T18:30:00.000Z", date: "2026-11-06" },
        { kind: "qualifying", startsAt: "2026-11-07T18:00:00.000Z", date: "2026-11-07" },
      ]),
    ).toBe("2026-11-06T18:30:00.000Z");
    expect(predictionDeadline([])).toBeNull();
  });
});

describe("validación", () => {
  const allowed = new Set(["ver", "ham", "ant", "nor"]);
  it("el podio no repite pilotos y todos están en la parrilla", () => {
    expect(validPicks({ p1: "ver", p2: "ham", p3: "ant", pole: "ver" }, allowed)).toBe(true);
    expect(validPicks({ p1: "ver", p2: "ver", p3: "ant", pole: "ver" }, allowed)).toBe(false);
    expect(validPicks({ p1: "ver", p2: "ham", p3: "xxx", pole: "ver" }, allowed)).toBe(false);
  });

  it("alias y nombres de liga (COM-13)", () => {
    expect(validateName("Undercut_Club")).toBeNull();
    expect(validateName("Peña Ñúñez")).toBeNull();
    expect(validateName("ab")).toBe("length");
    expect(validateName("<script>")).toBe("characters");
    expect(validateName("Admin oficial")).toBe("blocked");
    expect(validateName("sh1t team")).toBe("blocked");
  });
});

describe("ranking (COM-06)", () => {
  it("desempata por podios exactos y poles, y comparte posición si siguen igual", () => {
    const ranked = rankUsers([
      { id: "a", points: 20, exact: 2, poles: 1 },
      { id: "b", points: 20, exact: 3, poles: 0 },
      { id: "c", points: 15, exact: 1, poles: 1 },
      { id: "d", points: 15, exact: 1, poles: 1 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([["b", 1], ["a", 2], ["c", 3], ["d", 3]]);
  });
});
