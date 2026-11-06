import type { Lang } from "@paddock/shared";

/**
 * Notas editoriales de las frenadas (NUC-44, CON-05). Cada nota se sitúa en la vuelta con `at` (0 = línea de
 * meta, 1 = vuelta completa) y se casa con la frenada detectada más cercana, a menos de `TOLERANCE`.
 * Así no depende del número de frenadas que detecte cada año. `turn` es el número oficial de la curva.
 * Solo se escriben notas comprobadas contra la telemetría del circuito (contenido.md §5.4).
 */
export interface CornerNote {
  at: number;
  turn: string;
  note: Record<Lang, string>;
}

export const TOLERANCE = 0.03;

export const CIRCUIT_NOTES: Record<string, CornerNote[]> = {
  // Autódromo Hermanos Rodríguez. Comprobado con la telemetría de 2026 (vuelta de 4,15 km medida).
  rodriguez: [
    {
      at: 0.277,
      turn: "1",
      note: {
        es: "La frenada más fuerte de la vuelta, al final de más de un kilómetro de recta: el mejor sitio para adelantar.",
        en: "The hardest stop of the lap, after more than a kilometre of straight: the best place to overtake.",
      },
    },
    {
      at: 0.605,
      turn: "7–11",
      note: {
        es: "Las eses, rápidas y enlazadas. A 2.200 metros de altitud el aire es fino y los coches tienen menos carga aerodinámica de la que su ajuste promete.",
        en: "The esses, fast and linked. At 2,200 metres the air is thin and the cars have less downforce than their set-up suggests.",
      },
    },
    {
      at: 0.853,
      turn: "12–16",
      note: {
        es: "Entrada al estadio Foro Sol: la parte más lenta del circuito, con las gradas alrededor.",
        en: "Into the Foro Sol stadium: the slowest part of the track, with the grandstands all around.",
      },
    },
  ],
};

/** La nota de cada frenada, si la hay: la más cercana dentro de la tolerancia, y cada nota una sola vez. */
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
