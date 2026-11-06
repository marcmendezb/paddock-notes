import type { Metadata } from "next";
import Link from "next/link";
import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { TOOL_ORDER } from "@/lib/tools";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).analysis;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/analysis`, languages: { es: "/es/analysis", en: "/en/analysis" } },
  };
}

/** Portada de análisis (TEC-01): las últimas carreras analizadas, con enlace a cada herramienta. */
export default async function AnalysisIndexPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const list = await api.analysisList();

  return (
    <div className="container stack-xl">
      <div className="stack-s">
        <h1>{t.analysis.title}</h1>
        <p className="lede">{t.analysis.lede}</p>
        <p className="muted">{t.analysis.onlyFrom2023}</p>
      </div>
      <section aria-labelledby="latest" className="stack">
        <h2 id="latest">{t.analysis.latest}</h2>
        {list && list.data.length > 0 ? (
          <ul className="stack">
            {list.data.map((r) => (
              <li key={`${r.season}-${r.round}`} className="stack-s">
                <h3 className="h-small">
                  <Link href={`/${lang}/analysis/${r.season}/${r.round}`}>
                    {gpName(lang, r.name)} {r.season}
                  </Link>
                </h3>
                <p className="muted tabular">{formatDate(lang, r.date)}</p>
                <ul className="link-list">
                  {TOOL_ORDER.filter((tool) => r.tools.includes(tool)).map((tool) => (
                    <li key={tool}>
                      <Link href={`/${lang}/analysis/${r.season}/${r.round}/${tool}`}>{t.analysis.tools[tool].name}</Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.analysis.none}</p>
        )}
      </section>
    </div>
  );
}
