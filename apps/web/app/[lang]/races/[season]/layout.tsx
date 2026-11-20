import type { ReactNode } from "react";
import { parseSeason } from "@/lib/params";

/**
 * Validates the season in the layout, outside any Suspense boundary: an invalid URL answers a real 404
 * and not a 200 with the error page (D-22).
 */
export default async function SeasonLayout({ children, params }: { children: ReactNode; params: Promise<{ season: string }> }) {
  parseSeason((await params).season);
  return children;
}
