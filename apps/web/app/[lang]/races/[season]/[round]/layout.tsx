import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { parseRound, parseSeason } from "@/lib/params";

/** Checks the race exists in the layout, outside any Suspense boundary, to answer a real 404 (D-22). */
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
