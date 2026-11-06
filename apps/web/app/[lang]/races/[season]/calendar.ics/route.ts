import { gpName, seasonIcs } from "@paddock/shared";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang, parseSeason } from "@/lib/params";
import { SITE_URL } from "@/lib/site";

/** Calendario de la temporada en formato .ics (NUC-16). */
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; season: string }> }) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const schedule = await api.schedule(season);
  if (!schedule) return new Response("Not found", { status: 404 });

  const t = dict(lang);
  const ics = seasonIcs(
    schedule.data,
    {
      calendarName: `Paddock Notes · F1 ${season}`,
      session: t.sessions,
      raceName: (name) => gpName(lang, name),
      url: (s, r) => `${SITE_URL}/${lang}/races/${s}/${r}`,
    },
    new URL(SITE_URL).hostname,
  );
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="paddock-notes-${season}.ics"`,
    },
  });
}
