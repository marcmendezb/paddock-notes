import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { parseRound, parseSeason } from "@/lib/params";

/** Comprueba que la carrera existe antes del Suspense de loading.tsx, para responder 404 real. */
export default async function RaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ season: string; round: string }>;
}) {
  const p = await params;
  const race = await api.race(parseSeason(p.season), parseRound(p.round));
  if (!race) notFound();
  return children;
}
