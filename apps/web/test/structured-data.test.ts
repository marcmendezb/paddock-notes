import { describe, expect, it } from "vitest";
import { articleLd, definedTermLd, sportsEventLd } from "../lib/structured-data";

/**
 * The fields Google asks for for each type (developers.google.com/search/docs/appearance/structured-data):
 * Event requires name, startDate and location with address; Article recommends headline, image,
 * dateModified and author with name and url (CON-08).
 */

const race = {
  season: 2026,
  round: 20,
  date: "2026-11-08",
  startsAt: "2026-11-08T17:00:00.000Z",
  status: "next" as const,
  circuit: { id: "interlagos", name: "Autódromo José Carlos Pace", locality: "São Paulo", country: "Brazil", lat: -23.7036, lng: -46.6997 },
};
const ctx = { lang: "es" as const, site: "https://paddocknotes.dev", name: "Gran Premio de Brasil", description: "Ronda 20." };

describe("SportsEvent (CON-08)", () => {
  const ld = sportsEventLd(race, ctx);

  it("includes Google mandatory schema fields", () => {
    expect(ld.name).toBe("Gran Premio de Brasil");
    expect(ld.startDate).toBe("2026-11-08T17:00:00.000Z");
    expect(ld.location.address).toEqual({ "@type": "PostalAddress", addressLocality: "São Paulo", addressCountry: "BR" });
  });

  it("includes recommended fields without fictitious organizers", () => {
    expect(ld.endDate).toBe("2026-11-08T19:00:00.000Z");
    expect(ld.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
    expect(ld.url).toBe("https://paddocknotes.dev/es/races/2026/20");
    expect(ld.image[0]).toBe("https://paddocknotes.dev/es/races/2026/20/opengraph-image");
    expect(ld).not.toHaveProperty("organizer");
  });

  it("marks cancelled races with EventCancelled status", () => {
    expect(sportsEventLd({ ...race, status: "cancelled" }, ctx).eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("falls back to race date when start time is not provided", () => {
    const ld2 = sportsEventLd({ ...race, startsAt: null }, ctx);
    expect(ld2.startDate).toBe("2026-11-08");
    expect(ld2.endDate).toBe("2026-11-08");
  });
});

describe("Article and DefinedTerm schemas (CON-08)", () => {
  it("generates Article schema with image, date and author link", () => {
    const ld = articleLd({ slug: "points", headline: "Cómo se reparten los puntos", description: "Desde 2010…", dateModified: "2026-11-06" }, { lang: "es", site: "https://paddocknotes.dev" });
    expect(ld.image).toEqual(["https://paddocknotes.dev/es/opengraph-image"]);
    expect(ld.author).toEqual({ "@type": "Organization", name: "Paddock Notes", url: "https://paddocknotes.dev/es/about" });
    expect(ld.url).toBe("https://paddocknotes.dev/es/learn/points");
  });

  it("links DefinedTerm schema to glossary set", () => {
    const ld = definedTermLd({ id: "undercut", term: "Undercut", definition: "Parar antes…", setName: "Glosario" }, { lang: "es", site: "https://paddocknotes.dev" });
    expect(ld.url).toBe("https://paddocknotes.dev/es/learn/glossary/undercut");
    expect(ld.inDefinedTermSet.url).toBe("https://paddocknotes.dev/es/learn/glossary");
  });
});
