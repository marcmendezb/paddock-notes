import type { MDXContent } from "mdx/types";
import type { Lang } from "@paddock/shared";
import MexicoEs from "./notes/es/2026-mexico.mdx";
import MexicoEn from "./notes/en/2026-mexico.mdx";
import MexicoDe from "./notes/de/2026-mexico.mdx";

/**
 * The bodies of the post-race notes (CON-04). The index (title, date, race) is in
 * `@paddock/shared` (NOTES). Explicit imports, no dynamic paths: each note exists in all three languages.
 */
const BODIES: Record<Lang, Record<string, MDXContent>> = {
  es: { "2026-mexico": MexicoEs },
  en: { "2026-mexico": MexicoEn },
  de: { "2026-mexico": MexicoDe },
};

export function noteBody(lang: Lang, slug: string): MDXContent | null {
  return BODIES[lang][slug] ?? null;
}
