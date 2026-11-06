import type { Metadata } from "next";
import { SeasonPicker } from "@/components/season-picker";
import { StaleNotice } from "@/components/site-chrome";
import { SeasonMap } from "@/components/season-map";
import { CalendarTable } from "@/components/tables";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang, parseSeason } from "@/lib/params";

type Params = { params: Promise<{ lang: string; season: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  return {
    title: lang === "es" ? `Calendario F1 ${season}: fechas y horarios` : `${season} F1 calendar: dates and times`,
    description:
      lang === "es"
        ? `Todas las carreras de la temporada ${season} con horarios en tu zona horaria.`
        : `Every race of the ${season} season with times in your time zone.`,
    alternates: {
      canonical: `/${lang}/races/${season}`,
      languages: { es: `/es/races/${season}`, en: `/en/races/${season}` },
    },
  };
}

export default async function CalendarPage({ params }: Params) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const t = dict(lang);
  const schedule = await api.schedule(season);

  return (
    <div className="container stack-l">
      <div className="page-head">
        <h1>{t.calendar.title(season)}</h1>
        <SeasonPicker lang={lang} season={season} base="races" />
      </div>
      {schedule?.stale ? <StaleNotice lang={lang} updatedAt={schedule.updatedAt} /> : null}
      {schedule ? (
        <>
          <CalendarTable lang={lang} races={schedule.data} />
          <p>
            <a href={`/${lang}/races/${season}/calendar.ics`} download>
              {t.home.addToCalendar}
            </a>
          </p>
          <section aria-labelledby="season-map" className="stack">
            <h2 id="season-map">{t.map.title}</h2>
            <SeasonMap lang={lang} races={schedule.data.filter((r) => r.status !== "cancelled")} season={season} />
          </section>
          {schedule.updatedAt ? (
            <p className="source">{t.source("Jolpica F1", formatDate(lang, schedule.updatedAt))}</p>
          ) : null}
        </>
      ) : (
        <p className="muted">{t.home.noData}</p>
      )}
    </div>
  );
}
