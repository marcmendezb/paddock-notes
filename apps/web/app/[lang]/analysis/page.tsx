import type { Metadata } from "next";
import Link from "next/link";
import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { TOOL_ICON, TOOL_ORDER } from "@/lib/tools";
import { Icon } from "@/components/icons";
import { HeroStats, PageHero } from "@/components/page-hero";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).analysis;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/analysis`, languages: { es: "/es/analysis", en: "/en/analysis", de: "/de/analysis" } },
  };
}

/** Portada de análisis (TEC-01): las últimas carreras analizadas, con enlace a cada herramienta. */
export default async function AnalysisIndexPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const list = await api.analysisList();

  const races = list?.data ?? [];
  const [latest, ...older] = races;

  return (
    <>
      <PageHero
        icon="chart"
        kicker={t.analysis.kicker}
        title={t.analysis.title}
        lede={
          <>
            <p>{t.analysis.lede}</p>
            <p>{t.analysis.onlyFrom2023}</p>
          </>
        }
        aside={
          <HeroStats
            items={[
              { label: t.analysis.statRaces, value: races.length, accent: true },
              { label: t.analysis.statTools, value: TOOL_ORDER.length },
              { label: t.analysis.statSince, value: 2023 },
            ]}
          />
        }
      />
      <div className="container stack-xl">
        {latest ? (
          <section aria-labelledby="latest" className="an-latest" data-surface="ink">
            <div className="an-latest-head">
              <p className="eyebrow">
                {t.analysis.latestOne} · {t.analysis.round(latest.round)} · <span className="tabular">{formatDate(lang, latest.date)}</span>
              </p>
              <h2 id="latest" className="an-latest-title">
                <Link href={`/${lang}/analysis/${latest.season}/${latest.round}`}>
                  {gpName(lang, latest.name)} {latest.season}
                </Link>
              </h2>
            </div>
            <ul className="tiles">
              {TOOL_ORDER.filter((tool) => latest.tools.includes(tool)).map((tool) => (
                <li key={tool}>
                  <Link href={`/${lang}/analysis/${latest.season}/${latest.round}/${tool}`} className="tile">
                    <span className="tile-icon">
                      <Icon name={TOOL_ICON[tool]} />
                    </span>
                    <span className="tile-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="tile-title">{t.analysis.tools[tool].name}</span>
                    <span className="tile-text">{t.analysis.tools[tool].q}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="muted">{t.analysis.none}</p>
        )}

        {older.length ? (
          <section aria-labelledby="all">
            <div className="section-head">
              <h2 id="all" className="section-title">
                {t.analysis.all}
              </h2>
            </div>
            <ul className="tiles">
              {older.map((r) => (
                <li key={`${r.season}-${r.round}`}>
                  <Link href={`/${lang}/analysis/${r.season}/${r.round}`} className="tile">
                    <span className="tile-n tabular" aria-hidden="true">
                      {String(r.round).padStart(2, "0")}
                    </span>
                    <span className="tile-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="tile-title">
                      {gpName(lang, r.name)} {r.season}
                    </span>
                    <span className="tile-meta">
                      {formatDate(lang, r.date)} · {t.header.mega.analysis.tools(r.tools.length)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
