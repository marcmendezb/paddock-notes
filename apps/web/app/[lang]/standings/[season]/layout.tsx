import type { ReactNode } from "react";
import { parseSeason } from "@/lib/params";

/**
 * Valida la temporada fuera del Suspense de loading.tsx: así una URL inválida responde 404 de verdad
 * y no un 200 con la página de error.
 */
export default async function SeasonLayout({ children, params }: { children: ReactNode; params: Promise<{ season: string }> }) {
  parseSeason((await params).season);
  return children;
}
