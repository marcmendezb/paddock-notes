import { describe, expect, it } from "vitest";
import { field, simulate } from "../lib/simulator";

const drivers = [
  { id: "ant", name: "Antonelli", points: 380 },
  { id: "ver", name: "Verstappen", points: 261 },
];
const rounds = [
  { round: 20, name: "Brazil", isSprintWeekend: true },
  { round: 21, name: "Las Vegas", isSprintWeekend: false },
];

describe("championship simulator (COM-09)", () => {
  it("calculates race and sprint points according to selected positions", () => {
    const { projected } = simulate(2026, drivers, rounds, {
      [field("r", 20, "ver")]: "1",
      [field("s", 20, "ver")]: "1",
      [field("r", 21, "ver")]: "1",
      [field("r", 20, "ant")]: "10",
    });
    expect(projected.find((d) => d.id === "ver")?.total).toBe(261 + 25 + 8 + 25);
    expect(projected.find((d) => d.id === "ant")?.total).toBe(381);
    expect(projected[0]!.id).toBe("ant");
  });

  it("detects position conflicts when two drivers share a spot", () => {
    const { conflicts } = simulate(2026, drivers, rounds, { [field("r", 21, "ver")]: "1", [field("r", 21, "ant")]: "1" });
    expect(conflicts).toEqual([{ round: 21, kind: "r", position: 1 }]);
  });

  it("safely ignores invalid values from URL search params", () => {
    const { projected } = simulate(2026, drivers, rounds, { [field("r", 21, "ver")]: "<script>", [field("r", 20, "ver")]: "99" });
    expect(projected.find((d) => d.id === "ver")?.total).toBe(261);
  });
});
