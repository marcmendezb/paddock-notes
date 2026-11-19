import type { Metadata } from "next";
import { SeasonPicker } from "@/components/season-picker";
import { StaleNotice } from "@/components/site-chrome";
import { SeasonMap } from "@/components/season-map";
import { NextRaceFeature, SeasonHero, SeasonRounds } from "@/components/season-view";
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
    title: { es: `Calendario F1 ${season}: fechas y horarios`, en: `${season} F1 calendar: dates and times`, de: `F1-Kalender ${season}: Termine und Zeiten` }[lang],
    description: {
      es: `Todas las carreras de la temporada ${season} con horarios en tu zona horaria.`,
      en: `Every race of the ${season} season with times in your time zone.`,
      de: `Alle Rennen der Saison ${season} mit Zeiten in deiner Zeitzone.`,
    }[lang],
    alternates: {
      canonical: `/${lang}/races/${season}`,
      languages: { es: `/es/races/${season}`, en: `/en/races/${season}`, de: `/de/races/${season}` },
    },
  };
}

export default async function CalendarPage({ params }: Params) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const t = dict(lang);
  const schedule = await api.schedule(season);
  const races = schedule?.data ?? [];
  const next = races.find((r) => r.status === "next") ?? null;
  const layout = next ? await api.circuitLayout(next.circuit.id).catch(() => null) : null;
  const picker = <SeasonPicker lang={lang} season={season} base="races" />;

  return (
    <>
      <SeasonHero lang={lang} season={season} races={races} picker={picker} />
      <div className="container stack-xl">
        {schedule?.stale ? <StaleNotice lang={lang} updatedAt={schedule.updatedAt} /> : null}
        {schedule ? (
          <>
            {next ? <NextRaceFeature lang={lang} race={next} layout={layout?.data.points ?? null} /> : null}
            <SeasonRounds lang={lang} races={races} />
            <section aria-labelledby="season-map" className="stack">
              <h2 id="season-map" className="sv-section-title">
                {t.map.title}
              </h2>
              <SeasonMap lang={lang} races={races.filter((r) => r.status !== "cancelled")} season={season} />
            </section>
            {schedule.updatedAt ? (
              <p className="source">{t.source("Jolpica F1", formatDate(lang, schedule.updatedAt))}</p>
            ) : null}
          </>
        ) : (
          <p className="muted">{t.home.noData}</p>
        )}
      </div>
    </>
  );
}
