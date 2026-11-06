import { countryCode, sessionDurationMs, type Lang, type RaceSummary } from "@paddock/shared";

/**
 * Datos estructurados (CON-08) con los campos que pide Google para cada tipo: obligatorios y recomendados
 * que tenemos de verdad. Sin `organizer`: el proyecto no es oficial y no hablamos en nombre de nadie.
 * Funciones puras para poder probarlas sin renderizar páginas.
 */

const org = (site: string, lang: Lang) => ({ "@type": "Organization", name: "Paddock Notes", url: `${site}/${lang}/about` });

export function sportsEventLd(
  race: Pick<RaceSummary, "season" | "round" | "date" | "startsAt" | "status" | "circuit">,
  { lang, site, name, description }: { lang: Lang; site: string; name: string; description: string },
) {
  const start = race.startsAt ?? race.date;
  const end = race.startsAt ? new Date(Date.parse(race.startsAt) + sessionDurationMs("race")).toISOString() : race.date;
  const page = `${site}/${lang}/races/${race.season}/${race.round}`;
  const country = countryCode(race.circuit.country);
  return {
    "@type": "SportsEvent",
    name,
    description,
    sport: "Formula 1",
    url: page,
    image: [`${page}/opengraph-image`],
    startDate: start,
    endDate: end,
    eventStatus: race.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: race.circuit.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: race.circuit.locality,
        ...(country ? { addressCountry: country } : {}),
      },
      geo: { "@type": "GeoCoordinates", latitude: race.circuit.lat, longitude: race.circuit.lng },
    },
  };
}

export function articleLd(
  {
    slug,
    headline,
    description,
    dateModified,
    datePublished,
    section = "learn",
  }: { slug: string; headline: string; description: string; dateModified: string; datePublished?: string; section?: "learn" | "notes" },
  { lang, site }: { lang: Lang; site: string },
) {
  return {
    "@type": "Article",
    headline,
    description,
    inLanguage: lang,
    url: `${site}/${lang}/${section}/${slug}`,
    image: [`${site}/${lang}/opengraph-image`],
    ...(datePublished ? { datePublished } : {}),
    dateModified,
    author: org(site, lang),
    publisher: org(site, lang),
  };
}

export function definedTermLd(
  { id, term, definition, setName }: { id: string; term: string; definition: string; setName: string },
  { lang, site }: { lang: Lang; site: string },
) {
  return {
    "@type": "DefinedTerm",
    name: term,
    description: definition,
    inLanguage: lang,
    url: `${site}/${lang}/learn/glossary/${id}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: setName, url: `${site}/${lang}/learn/glossary` },
  };
}
