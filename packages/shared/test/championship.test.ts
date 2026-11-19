import { describe, expect, it } from "vitest";
import { maxPointsPerRound, recalculatePoints, titleContenders } from "../src";

describe("points at stake per round", () => {
  it("follow regulations of each era", () => {
    expect(maxPointsPerRound(2026, false)).toBe(25);
    expect(maxPointsPerRound(2026, true)).toBe(33);
    expect(maxPointsPerRound(2023, false)).toBe(26);
    expect(maxPointsPerRound(2021, true)).toBe(29);
    expect(maxPointsPerRound(2009, false)).toBeNull();
  });
});

describe("title contenders still in contention (NUC-36)", () => {
  const standings = [
    { id: "a", points: 380 },
    { id: "b", points: 330 },
    { id: "c", points: 305 },
    { id: "d", points: 100 },
  ];
  const rounds = (n: number, sprint = 0) =>
    Array.from({ length: n }, (_, i) => ({ isSprintWeekend: i < sprint }));

  it("counts remaining points, including sprints", () => {
    // 3 races left (75) + 1 sprint (8) = 83 points.
    expect(titleContenders(2026, standings, rounds(3, 1))).toEqual(["a", "b", "c"]);
  });

  it("exact tie is still possible", () => {
    expect(titleContenders(2026, [{ id: "a", points: 100 }, { id: "b", points: 75 }], rounds(1))).toEqual(["a", "b"]);
  });

  it("when season is over, only the leader remains", () => {
    expect(titleContenders(2026, standings, [])).toEqual(["a"]);
  });

  it("does not compute for scoring systems prior to 2010", () => {
    expect(titleContenders(2005, standings, rounds(2))).toBeNull();
  });
});

describe("points per position", async () => {
  const { racePoints, sprintPoints } = await import("../src");
  it("race points since 2010", () => {
    expect(racePoints(2026, 1)).toBe(25);
    expect(racePoints(2026, 10)).toBe(1);
    expect(racePoints(2026, 11)).toBe(0);
    expect(racePoints(2026, null)).toBe(0);
    expect(racePoints(2009, 1)).toBeNull();
  });
  it("sprint points", () => {
    expect(sprintPoints(2026, 1)).toBe(8);
    expect(sprintPoints(2026, 9)).toBe(0);
    expect(sprintPoints(2021, 1)).toBe(3);
  });
});

describe("quiz", async () => {
  const { isoWeek, seededRandom, shuffle } = await import("../src");
  it("ISO week", () => {
    expect(isoWeek(new Date("2026-11-06T12:00:00Z"))).toBe("2026-W45");
    expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
    expect(isoWeek(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
  });
  it("order is deterministic for the same week", () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom("2026-W45"))).toEqual(shuffle([1, 2, 3, 4, 5], seededRandom("2026-W45")));
    expect(shuffle([1, 2, 3, 4, 5], seededRandom("2026-W45"))).not.toEqual(shuffle([1, 2, 3, 4, 5], seededRandom("2026-W46")));
  });
});

describe("recalculation under modern scoring system (HIS-06)", () => {
  it("sums race and sprint points and breaks ties by wins, then second places", () => {
    const rows = recalculatePoints([
      { driverId: "a", kind: "race", position: 1 }, // 25
      { driverId: "a", kind: "race", position: null },
      { driverId: "b", kind: "race", position: 2 }, // 18
      { driverId: "b", kind: "sprint", position: 1 }, // 8 → 26
      { driverId: "c", kind: "race", position: 2 }, // 18
      { driverId: "c", kind: "race", position: 11 }, // 0
      { driverId: "d", kind: "race", position: 3 }, // 15
      { driverId: "d", kind: "race", position: 10 }, // 1
      { driverId: "d", kind: "sprint", position: 7 }, // 2 → 18
    ]);
    expect(rows.map((r) => [r.driverId, r.points])).toEqual([["b", 26], ["a", 25], ["c", 18], ["d", 18]]);
  });
});
