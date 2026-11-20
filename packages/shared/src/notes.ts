import type { Lang } from "./constants";

/**
 * Post-race notes (CON-04): the index of what is published. The text lives in MDX in
 * `apps/web/content/notes/`, written separately per language (content.md §5.1 and §13). It lives here, not
 * in the web app, because the newsletter (ingestion) also links each race's note.
 */
export interface RaceNote {
  slug: string;
  season: number;
  round: number;
  /** Publication date (YYYY-MM-DD). */
  date: string;
  title: Record<Lang, string>;
  /** Lede: what happened and why it matters for the championship. Also the meta description. */
  description: Record<Lang, string>;
  /** Related explainer (the "To understand it better" section). */
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
