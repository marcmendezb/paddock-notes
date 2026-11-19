import type { Lang } from "./constants";

/**
 * Notas post-carrera (CON-04): índice de lo publicado. El texto vive en MDX en `apps/web/content/notes/`,
 * en ES y EN escritos por separado (contenido.md §5.1 y §13). Está aquí, y no en la web, porque la
 * newsletter (ingesta) también enlaza la nota de cada carrera.
 */
export interface RaceNote {
  slug: string;
  season: number;
  round: number;
  /** Fecha de publicación (AAAA-MM-DD). */
  date: string;
  title: Record<Lang, string>;
  /** Entradilla: qué pasó y por qué importa para el campeonato. También es la meta descripción. */
  description: Record<Lang, string>;
  /** Explicador relacionado (sección «Para entenderlo mejor»). */
  explainer: string;
}

export const NOTES: RaceNote[] = [
  {
    slug: "2026-mexico",
    season: 2026,
    round: 19,
    date: "2026-11-03",
    title: {
      es: "Una parada en la vuelta 43 cambió México; Antonelli ya es campeón",
      en: "A lap-43 stop changed Mexico; Antonelli is already champion",
      de: "Ein Stopp in Runde 43 hat Mexiko entschieden; Antonelli ist schon Weltmeister",
    },
    description: {
      es: "Verstappen ganó en México por 0,799 s tras heredar el liderato en la vuelta 44. Antonelli fue tercero y ya no le pueden alcanzar: es campeón con cuatro carreras por delante.",
      en: "Verstappen won in Mexico by 0.799 s after inheriting the lead on lap 44. Antonelli was third and can no longer be caught: he is champion with four races to go.",
      de: "Verstappen gewann in Mexiko mit 0,799 s Vorsprung, nachdem er in Runde 44 die Führung geerbt hatte. Antonelli wurde Dritter und ist nicht mehr einzuholen: Er ist vier Rennen vor Schluss Weltmeister.",
    },
    explainer: "safety-car",
  },
];

export function noteFor(season: number, round: number): RaceNote | null {
  return NOTES.find((n) => n.season === season && n.round === round) ?? null;
}
