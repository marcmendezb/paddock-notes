import type { OpenF1RaceControl } from "@paddock/shared/openf1";
import type { NeutralisedPeriod } from "./types";

/**
 * Periodos de coche de seguridad, VSC y bandera roja a partir de los mensajes de dirección de carrera.
 * - Empieza con "DEPLOYED" (SC o VSC) o con "RED FLAG".
 * - Termina con "IN THIS LAP", "ENDING" o "RESUME", o cuando empieza otro periodo (un SC que acaba en
 *   bandera roja, por ejemplo).
 * - Si nunca se cierra, dura una vuelta.
 * Se ignoran los mensajes de luces del coche de seguridad y de los comisarios, y todo lo posterior a la
 * bandera a cuadros (México 2026: un comunicado de la vuelta 71 citaba la bandera roja de la 45).
 */
export function neutralisedPeriods(messages: OpenF1RaceControl[], totalLaps: number): NeutralisedPeriod[] {
  const periods: NeutralisedPeriod[] = [];
  let open = null as NeutralisedPeriod | null;
  const sorted = [...messages].filter((m) => m.lap_number != null).sort((a, b) => a.date.localeCompare(b.date));

  for (const m of sorted) {
    const lap = m.lap_number!;
    const msg = m.message.toUpperCase();
    // Tras la bandera a cuadros solo quedan mensajes de comisarios, que pueden citar periodos anteriores.
    if (m.flag === "CHEQUERED") break;
    // Mensajes de los comisarios y de las luces del coche de seguridad: no abren ni cierran periodos.
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
