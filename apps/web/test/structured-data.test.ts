import { describe, expect, it } from "vitest";
import { articleLd, definedTermLd, sportsEventLd } from "../lib/structured-data";

/**
 * Campos que pide Google para cada tipo (developers.google.com/search/docs/appearance/structured-data):
 * Event, obligatorios name, startDate y location con address; Article, recomendados headline, image,
 * dateModified y author con name y url (CON-08).
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

  it("lleva los campos obligatorios de Google", () => {
    expect(ld.name).toBe("Gran Premio de Brasil");
    expect(ld.startDate).toBe("2026-11-08T17:00:00.000Z");
    expect(ld.location.address).toEqual({ "@type": "PostalAddress", addressLocality: "São Paulo", addressCountry: "BR" });
  });

  it("y los recomendados que tenemos de verdad, sin organizador", () => {
    expect(ld.endDate).toBe("2026-11-08T19:00:00.000Z");
    expect(ld.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
    expect(ld.url).toBe("https://paddocknotes.dev/es/races/2026/20");
    expect(ld.image[0]).toBe("https://paddocknotes.dev/es/races/2026/20/opengraph-image");
    expect(ld).not.toHaveProperty("organizer");
  });

  it("una carrera cancelada lo dice", () => {
    expect(sportsEventLd({ ...race, status: "cancelled" }, ctx).eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("sin hora de salida usa la fecha", () => {
    const ld2 = sportsEventLd({ ...race, startsAt: null }, ctx);
    expect(ld2.startDate).toBe("2026-11-08");
    expect(ld2.endDate).toBe("2026-11-08");
  });
});

describe("Article y DefinedTerm (CON-08)", () => {
  it("Article con imagen, fecha y autor enlazado", () => {
    const ld = articleLd({ slug: "points", headline: "Cómo se reparten los puntos", description: "Desde 2010…", dateModified: "2026-11-06" }, { lang: "es", site: "https://paddocknotes.dev" });
    expect(ld.image).toEqual(["https://paddocknotes.dev/es/opengraph-image"]);
    expect(ld.author).toEqual({ "@type": "Organization", name: "Paddock Notes", url: "https://paddocknotes.dev/es/about" });
    expect(ld.url).toBe("https://paddocknotes.dev/es/learn/points");
  });

  it("DefinedTerm enlazado a su glosario", () => {
    const ld = definedTermLd({ id: "undercut", term: "Undercut", definition: "Parar antes…", setName: "Glosario" }, { lang: "es", site: "https://paddocknotes.dev" });
    expect(ld.url).toBe("https://paddocknotes.dev/es/learn/glossary/undercut");
    expect(ld.inDefinedTermSet.url).toBe("https://paddocknotes.dev/es/learn/glossary");
  });
});
