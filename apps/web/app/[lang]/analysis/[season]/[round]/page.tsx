import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gpName } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { TOOL_ICON, TOOL_ORDER } from "@/lib/tools";
import { Icon } from "@/components/icons";
import { HeroStats, PageHero } from "@/components/page-hero";
import { formatDate } from "@/lib/format";

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
      languages: { es: `/es/analysis/${season}/${round}`, en: `/en/analysis/${season}/${round}`, de: `/de/analysis/${season}/${round}` },
    },
  };
}

export default async function RaceAnalysisPage({ params }: Props) {
  const { lang, season, round, index, race } = await load(params);
  const t = dict(lang);
  const name = `${gpName(lang, race.name)} ${season}`;
  const winner = race.results[0];
  const tools = TOOL_ORDER.filter((tool) => index.tools.includes(tool));
  return (
    <>
      <PageHero
        icon="chart"
        size="m"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/analysis`, label: t.analysis.title }, { label: name }]} />}
        kicker={
          <>
            {t.analysis.kicker} · {t.analysis.round(round)} · <span className="tabular">{formatDate(lang, race.date)}</span>
          </>
        }
        title={name}
        lede={
          <p>
            <Link href={`/${lang}/races/${season}/${round}`} className="ph-link">
              {t.home.seeRace} →
            </Link>
          </p>
        }
        aside={
          <HeroStats
            items={[
              ...(winner ? [{ label: t.analysis.winner, value: winner.driver.familyName, sub: winner.constructor.name, accent: true }] : []),
              { label: t.analysis.statTools, value: tools.length },
            ]}
          />
        }
      />
      <div className="container">
        <ol className="tiles an-tools">
          {tools.map((tool, i) => (
            <li key={tool}>
              <Link href={`/${lang}/analysis/${season}/${round}/${tool}`} className="tile">
                <span className="tile-icon">
                  <Icon name={TOOL_ICON[tool]} />
                </span>
                <span className="tile-arrow" aria-hidden="true">
                  →
                </span>
                <span className="tile-title">{t.analysis.tools[tool].name}</span>
                <span className="tile-text">{t.analysis.tools[tool].q}</span>
                <span className="tile-meta tabular">{String(i + 1).padStart(2, "0")}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
