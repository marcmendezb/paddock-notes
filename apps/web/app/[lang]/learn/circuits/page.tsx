import type { Metadata } from "next";
import Link from "next/link";
import { countryName } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HeroStats, PageHero } from "@/components/page-hero";
import { smoothClosedPath } from "@/components/race-recap";
import { CIRCUIT_GUIDES, CIRCUIT_NAMES } from "@/content/circuit-guides";
import { CIRCUIT_OUTLINES } from "@/content/circuit-outlines";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).learn;
  return {
    title: t.circuitGuides,
    description: t.guidesLede,
    alternates: { canonical: `/${lang}/learn/circuits`, languages: { es: "/es/learn/circuits", en: "/en/learn/circuits", de: "/de/learn/circuits" } },
  };
}

/** The layout's box with a margin, for the viewBox. */
function box(points: [number, number][]): string {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
}

/**
 * Circuit guides (CON-05): their own index, with a clean URL, instead of an anchor inside "Learn".
 * Each guide is a card with its layout drawing itself on hover, the venue and the next Grand Prix there.
 */
export default async function CircuitGuidesPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const schedule = await api.schedule("current").catch(() => null);
  const races = schedule?.data ?? [];
  const ids = Object.keys(CIRCUIT_GUIDES);
  const guides = ids
    .map((id) => {
      const race = races.find((r) => r.circuit.id === id) ?? null;
      return { id, race, outline: CIRCUIT_OUTLINES[id] ?? null, updated: CIRCUIT_GUIDES[id]!.updated };
    })
    .sort((a, b) => (a.race?.date ?? "9999").localeCompare(b.race?.date ?? "9999"));

  return (
    <>
      <PageHero
        icon="pin"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/learn`, label: t.learn.title }, { label: t.learn.circuitGuides }]} />}
        kicker={t.learn.title}
        title={t.learn.circuitGuides}
        lede={<p>{t.learn.guidesLede}</p>}
        aside={<HeroStats items={[{ label: t.learn.statGuides, value: ids.length, accent: true }]} />}
      />
      <div className="container">
        <ul className="cg-grid">
          {guides.map((g, i) => {
            const upcoming = g.race && (g.race.status === "next" || g.race.status === "upcoming");
            return (
              <li key={g.id}>
                <Link href={`/${lang}/circuits/${g.id}`} className={i === 0 ? "cg-card is-first" : "cg-card"} data-surface="ink">
                  <span className="cg-n tabular" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {g.outline ? (
                    <svg className="cg-track" viewBox={box(g.outline)} aria-hidden="true" focusable="false">
                      <path d={smoothClosedPath(g.outline)} className="cg-track-base" />
                      <path d={smoothClosedPath(g.outline)} pathLength={1} className="cg-track-line" />
                    </svg>
                  ) : null}
                  <span className="cg-name">{CIRCUIT_NAMES[g.id] ?? g.id}</span>
                  {g.race ? (
                    <span className="cg-place">
                      {g.race.circuit.locality}, {countryName(lang, g.race.circuit.country)}
                    </span>
                  ) : null}
                  {upcoming && g.race ? (
                    <span className={g.race.status === "next" ? "cg-next is-next" : "cg-next"}>{t.learn.nextHere(formatDate(lang, g.race.date))}</span>
                  ) : null}
                  <span className="cg-cta">{t.learn.readGuide} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
