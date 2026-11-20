import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { paceNote, replayNote, sectorsNote, strategyNote } from "@/lib/analysis-notes";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { OG_SIZE, ogImage } from "@/lib/og";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { isTool } from "@/lib/tools";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Paddock Notes";

/** Each tool's social image (TEC-11): the automatic note's finding as the headline. */
export default async function Image({ params }: { params: Promise<{ lang: string; season: string; round: string; tool: string }> }) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const round = parseRound(p.round);
  const t = dict(lang);
  const tool = isTool(p.tool) ? p.tool : "strategy";
  const race = await api.race(season, round);
  const name = race ? `${gpName(lang, race.data.name)} ${season}` : String(season);

  let note: string | null = null;
  let updatedAt: string | null = null;
  if (tool === "strategy") {
    const d = await api.strategy(season, round);
    // Only the last sentence fits in the image: the winner's strategy.
    note = d ? (strategyNote(lang, d.data)?.split(". ").at(-1) ?? null) : null;
    updatedAt = d?.updatedAt ?? null;
  } else if (tool === "pace") {
    const d = await api.pace(season, round);
    note = d && paceNote(lang, d.data, d.data.drivers.slice(0, 2).map((x) => x.number));
    updatedAt = d?.updatedAt ?? null;
  } else if (tool === "sectors") {
    const d = await api.sectors(season, round);
    note = d && sectorsNote(lang, d.data);
    updatedAt = d?.updatedAt ?? null;
  } else if (tool === "replay") {
    const d = await api.replay(season, round);
    note = d && replayNote(lang, d.data);
    updatedAt = d?.updatedAt ?? null;
  }

  return ogImage({
    eyebrow: `${t.analysis.tools[tool].name} · ${name}`,
    title: note ?? t.analysis.tools[tool].q,
    footer: t.source("OpenF1", formatDate(lang, updatedAt ?? new Date().toISOString())).replace(/\.$/, ""),
  });
}
