import type { Lang } from "@paddock/shared";

/**
 * Editorial notes for the braking zones (NUC-44, CON-05). Each note is placed on the lap with `at` (0 =
 * finish line, 1 = full lap) and matched to the closest detected braking zone, within `TOLERANCE`.
 * That way it does not depend on how many braking zones are detected each year. `turn` is the official
 * corner number. Only notes checked against the circuit's telemetry are written (content.md §5.4).
 */
export interface CornerNote {
  at: number;
  turn: string;
  note: Record<Lang, string>;
}

export const TOLERANCE = 0.03;

export const CIRCUIT_NOTES: Record<string, CornerNote[]> = {
  // Autódromo Hermanos Rodríguez. Checked against the 2026 telemetry (a measured 4.15 km lap).
  rodriguez: [
    {
      at: 0.277,
      turn: "1",
      note: {
        es: "La frenada más fuerte de la vuelta, al final de más de un kilómetro de recta: el mejor sitio para adelantar.",
        en: "The hardest stop of the lap, after more than a kilometre of straight: the best place to overtake.",
        de: "Die härteste Bremszone der Runde, nach mehr als einem Kilometer Gerade: die beste Stelle zum Überholen.",
      },
    },
    {
      at: 0.605,
      turn: "7–11",
      note: {
        es: "Las eses, rápidas y enlazadas. A 2.200 metros de altitud el aire es fino y los coches tienen menos carga aerodinámica de la que su ajuste promete.",
        en: "The esses, fast and linked. At 2,200 metres the air is thin and the cars have less downforce than their set-up suggests.",
        de: "Die Esses, schnell und verbunden. Auf 2.200 Metern ist die Luft dünn, und die Autos haben weniger Abtrieb, als ihre Abstimmung verspricht.",
      },
    },
    {
      at: 0.853,
      turn: "12–16",
      note: {
        es: "Entrada al estadio Foro Sol: la parte más lenta del circuito, con las gradas alrededor.",
        en: "Into the Foro Sol stadium: the slowest part of the track, with the grandstands all around.",
        de: "Einfahrt ins Stadion Foro Sol: der langsamste Teil der Strecke, ringsum von Tribünen umgeben.",
      },
    },
  ],
  // Circuit of the Americas (Austin). Checked against the 2026 telemetry (a measured 5.39 km lap).
  americas: [
    {
      at: 0.115,
      turn: "1",
      note: {
        es: "Una horquilla a la izquierda en lo alto de una subida muy empinada. Se frena cuesta arriba y la curva es tan ancha que admite varias trazadas: en la salida caben coches en paralelo.",
        en: "A left-hand hairpin at the top of a very steep climb. Drivers brake uphill and the corner is so wide it allows several lines: at the start, cars fit side by side.",
        de: "Eine Linkshaarnadel am Ende einer sehr steilen Steigung. Gebremst wird bergauf, und die Kurve ist so breit, dass mehrere Linien gehen: Beim Start passen Autos nebeneinander.",
      },
    },
    {
      at: 0.466,
      turn: "11",
      note: {
        es: "Horquilla lenta antes de la recta más larga del circuito. Salir bien de aquí decide quién llega con rebufo a la curva 12.",
        en: "A slow hairpin before the longest straight on the track. A good exit here decides who arrives at turn 12 with the slipstream.",
        de: "Langsame Haarnadel vor der längsten Geraden der Strecke. Ein guter Ausgang hier entscheidet, wer mit Windschatten an Kurve 12 ankommt.",
      },
    },
    {
      at: 0.686,
      turn: "12",
      note: {
        es: "La frenada al final de la recta opuesta. Junto a la curva 1, el mejor punto para adelantar.",
        en: "The braking zone at the end of the back straight. Along with turn 1, the best place to overtake.",
        de: "Die Bremszone am Ende der Gegengeraden. Neben Kurve 1 die beste Stelle zum Überholen.",
      },
    },
  ],
};

/** Each braking zone's note, if there is one: the closest within the tolerance, each note used once. */
export function notesFor(circuitId: string, corners: { n: number; at: number }[]): Map<number, CornerNote> {
  const out = new Map<number, CornerNote>();
  for (const note of CIRCUIT_NOTES[circuitId] ?? []) {
    let best: { n: number; at: number } | undefined;
    for (const c of corners) {
      if (out.has(c.n)) continue;
      if (Math.abs(c.at - note.at) <= TOLERANCE && (!best || Math.abs(c.at - note.at) < Math.abs(best.at - note.at))) best = c;
    }
    if (best) out.set(best.n, note);
  }
  return out;
}
