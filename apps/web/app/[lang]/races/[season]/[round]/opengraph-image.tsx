import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { OG_SIZE, ogImage } from "@/lib/og";
import { parseLang, parseRound, parseSeason } from "@/lib/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Paddock Notes";

export default async function Image({ params }: { params: Promise<{ lang: string; season: string; round: string }> }) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const round = parseRound(p.round);
  const t = dict(lang);
  const race = await api.race(season, round);
  const name = race ? gpName(lang, race.data.name) : "";
  const [p1, p2, p3] = race?.data.results ?? [];
  return ogImage({
    eyebrow: `${t.home.round(round, season)} · ${race ? formatDate(lang, race.data.date) : ""}`,
    title: p1 && p2 && p3 ? t.race.lede(fullName(p1.driver), name, season, fullName(p2.driver), fullName(p3.driver)) : `${name} ${season}`,
    footer: t.source("Jolpica F1", formatDate(lang, race?.updatedAt ?? new Date().toISOString())).replace(/\.$/, ""),
  });
}
