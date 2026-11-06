import type { MDXContent } from "mdx/types";
import type { Lang } from "@paddock/shared";
import MexicoEs from "./notes/es/2026-mexico.mdx";
import MexicoEn from "./notes/en/2026-mexico.mdx";

/**
 * Cuerpos de las notas post-carrera (CON-04). El índice (título, fecha, carrera) está en
 * `@paddock/shared` (NOTES). Importaciones explícitas, sin rutas dinámicas: cada nota existe en los dos idiomas.
 */
const BODIES: Record<Lang, Record<string, MDXContent>> = {
  es: { "2026-mexico": MexicoEs },
  en: { "2026-mexico": MexicoEn },
};

export function noteBody(lang: Lang, slug: string): MDXContent | null {
  return BODIES[lang][slug] ?? null;
}
