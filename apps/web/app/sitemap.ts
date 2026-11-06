import type { MetadataRoute } from "next";
import { LANGS } from "@paddock/shared";
import { EXPLAINERS } from "@/content";
import { api } from "@/lib/api";
import { GLOSSARY } from "@/lib/glossary";
import { PAGE_SLUGS } from "@/lib/pages";
import { RECORD_TYPES } from "@/lib/records";
import { SITE_URL } from "@/lib/site";

// Se genera por petición: incluye las carreras y los análisis que haya en la API.
export const dynamic = "force-dynamic";

/** sitemap.xml con todas las páginas públicas en los dos idiomas (CON-09). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const season = new Date().getUTCFullYear();
  const paths = [
    "",
    `/races/${season}`,
    `/standings/${season}`,
    "/history",
    "/records",
    "/compare",
    "/analysis",
    "/learn",
    "/learn/glossary",
    "/quiz",
    "/simulator",
    ...PAGE_SLUGS.map((s) => `/${s}`),
    ...RECORD_TYPES.map((t) => `/records/${t}`),
    ...EXPLAINERS.map((e) => `/learn/${e.slug}`),
    ...GLOSSARY.map((g) => `/learn/glossary/${g.slug}`),
  ];

  try {
    const [schedule, analyses, standings] = await Promise.all([
      api.schedule(season),
      api.analysisList(),
      api.driverStandings(season),
    ]);
    for (const race of schedule?.data ?? []) if (race.status === "completed") paths.push(`/races/${race.season}/${race.round}`);
    for (const a of analyses?.data ?? []) {
      paths.push(`/analysis/${a.season}/${a.round}`, ...a.tools.map((tool) => `/analysis/${a.season}/${a.round}/${tool}`));
    }
    for (const row of standings?.data.rows ?? []) {
      paths.push(`/drivers/${row.driver.id}`, ...row.constructors.map((c) => `/constructors/${c.id}`));
    }
  } catch {
    // Sin API, el sitemap sigue incluyendo las páginas fijas.
  }

  return [...new Set(paths)].flatMap((path) =>
    LANGS.map((lang) => ({
      url: `${SITE_URL}/${lang}${path}`,
      alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
