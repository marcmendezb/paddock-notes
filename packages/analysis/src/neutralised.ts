import type { OpenF1RaceControl } from "@paddock/shared/openf1";
import type { NeutralisedPeriod } from "./types";

/**
 * Safety car, VSC and red flag periods from the race control messages.
 * - It starts with "DEPLOYED" (SC or VSC) or with "RED FLAG".
 * - It ends with "IN THIS LAP", "ENDING" or "RESUME", or when another period starts (an SC that ends in a
 *   red flag, for example).
 * - If it never closes, it lasts one lap.
 * Messages about the safety car lights and from the stewards are ignored, and so is everything after the
 * chequered flag (Mexico 2026: a notice on lap 71 cited the red flag from lap 45).
 */
export function neutralisedPeriods(messages: OpenF1RaceControl[], totalLaps: number): NeutralisedPeriod[] {
  const periods: NeutralisedPeriod[] = [];
  let open = null as NeutralisedPeriod | null;
  const sorted = [...messages].filter((m) => m.lap_number != null).sort((a, b) => a.date.localeCompare(b.date));

  for (const m of sorted) {
    const lap = m.lap_number!;
    const msg = m.message.toUpperCase();
    // After the chequered flag only stewards' messages remain, and they may cite earlier periods.
    if (m.flag === "CHEQUERED") break;
    // Stewards' and safety car light messages: they neither open nor close periods.
    if (msg.includes("LIGHTS") || msg.startsWith("FIA STEWARDS")) continue;
    const kind: NeutralisedPeriod["kind"] | null =
      msg.includes("VIRTUAL SAFETY CAR") || /\bVSC\b/.test(msg)
        ? "VSC"
        : msg.includes("SAFETY CAR")
          ? "SC"
          : m.flag === "RED" || msg.startsWith("RED FLAG")
            ? "RED"
            : msg.includes("RESUME")
              ? (open?.kind ?? null)
              : null;
    if (!kind) continue;

    const ends = msg.includes("IN THIS LAP") || msg.includes("ENDING") || msg.includes("RESUME");
    const starts = !ends && (msg.includes("DEPLOYED") || kind === "RED");

    if (starts) {
      if (open) periods.push({ ...open, toLap: Math.max(open.fromLap, lap) });
      open = { kind, fromLap: lap, toLap: lap };
    } else if (ends && open) {
      periods.push({ ...open, toLap: Math.max(open.fromLap, lap) });
      open = null;
    }
  }
  if (open) periods.push({ ...open, toLap: Math.min(totalLaps, open.fromLap + 1) });
  return periods;
}

export function isNeutralised(lap: number, periods: NeutralisedPeriod[]): boolean {
  return periods.some((p) => lap >= p.fromLap && lap <= p.toLap);
}
