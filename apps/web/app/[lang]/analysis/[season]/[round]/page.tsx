import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gpName } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { TOOL_ORDER } from "@/lib/tools";

type Props = { params: Promise<{ lang: string; season: string; round: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const round = parseRound(p.round);
  const [index, race] = await Promise.all([api.analysisIndex(season, round), api.race(season, round)]);
  if (!index || !race) notFound();
  return { lang, season, round, index: index.data, race: race.data };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, season, round, race } = await load(params);
  const name = `${gpName(lang, race.name)} ${season}`;
  return {
    title: `${dict(lang).analysis.title}: ${name}`,
    description: dict(lang).analysis.lede,
    alternates: {
      canonical: `/${lang}/analysis/${season}/${round}`,
      languages: { es: `/es/analysis/${season}/${round}`, en: `/en/analysis/${season}/${round}` },
    },
  };
}

export default async function RaceAnalysisPage({ params }: Props) {
  const { lang, season, round, index, race } = await load(params);
  const t = dict(lang);
  const name = `${gpName(lang, race.name)} ${season}`;
  return (
    <div className="container stack-xl">
      <div className="stack">
        <Breadcrumbs
          lang={lang}
          items={[{ href: `/${lang}/analysis`, label: t.analysis.title }, { label: name }]}
        />
        <h1>{name}</h1>
        <p>
          <Link href={`/${lang}/races/${season}/${round}`}>{t.home.seeRace}</Link>
        </p>
      </div>
      <div className="cards">
        {TOOL_ORDER.filter((tool) => index.tools.includes(tool)).map((tool) => (
          <section key={tool} className="stack-s" aria-labelledby={`tool-${tool}`}>
            <h2 id={`tool-${tool}`} className="h-small">
              <Link href={`/${lang}/analysis/${season}/${round}/${tool}`}>{t.analysis.tools[tool].name}</Link>
            </h2>
            <p className="muted">{t.analysis.tools[tool].q}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
