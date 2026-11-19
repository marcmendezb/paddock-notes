import type { MDXContent } from "mdx/types";
import type { Lang } from "@paddock/shared";
import InterlagosEs from "./circuit-guides/es/interlagos.mdx";
import InterlagosEn from "./circuit-guides/en/interlagos.mdx";
import InterlagosDe from "./circuit-guides/de/interlagos.mdx";
import VegasEs from "./circuit-guides/es/vegas.mdx";
import VegasEn from "./circuit-guides/en/vegas.mdx";
import VegasDe from "./circuit-guides/de/vegas.mdx";
import LosailEs from "./circuit-guides/es/losail.mdx";
import LosailEn from "./circuit-guides/en/losail.mdx";
import LosailDe from "./circuit-guides/de/losail.mdx";
import YasMarinaEs from "./circuit-guides/es/yas_marina.mdx";
import YasMarinaEn from "./circuit-guides/en/yas_marina.mdx";
import YasMarinaDe from "./circuit-guides/de/yas_marina.mdx";

/**
 * Fichas editoriales de circuito (CON-05, contenido.md §5.4): se publican antes de cada GP. Las cifras
 * (longitud, vueltas, primera edición, vuelta rápida) no van en el texto: las pinta la página con los datos.
 */
export interface CircuitGuide {
  /** Última revisión (AAAA-MM-DD). */
  updated: string;
  body: Record<Lang, MDXContent>;
}

export const CIRCUIT_GUIDES: Record<string, CircuitGuide> = {
  interlagos: { updated: "2026-11-06", body: { es: InterlagosEs, en: InterlagosEn, de: InterlagosDe } },
  vegas: { updated: "2026-11-06", body: { es: VegasEs, en: VegasEn, de: VegasDe } },
  losail: { updated: "2026-11-06", body: { es: LosailEs, en: LosailEn, de: LosailDe } },
  yas_marina: { updated: "2026-11-06", body: { es: YasMarinaEs, en: YasMarinaEn, de: YasMarinaDe } },
};

/** Nombre para enlazar la ficha sin consultar la API (índice de «Aprende»). */
export const CIRCUIT_NAMES: Record<string, string> = {
  interlagos: "Interlagos",
  vegas: "Las Vegas",
  losail: "Losail (Catar)",
  yas_marina: "Yas Marina (Abu Dabi)",
};
