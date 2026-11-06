import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { PaceChart, PaceTable } from "@/components/analysis/pace-chart";
import { StrategyChart, StrategyTable } from "@/components/analysis/strategy-chart";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";

/**
 * Gráficos que las notas post-carrera insertan en el MDX (CON-04): los mismos de la zona técnica, con los
 * datos reales de esa carrera, una frase de pie, la tabla equivalente (contenido.md §13) y el enlace a la
 * herramienta interactiva. Si el análisis no existe, no se pinta nada: nunca un gráfico vacío.
 */

function Figure({ lang, caption, tool, season, round, children }: { lang: Lang; caption: string; tool: string; season: number; round: number; children: React.ReactNode }) {
  const t = dict(lang).analysis;
  return (
    <div className="stack-s note-figure">
      {children}
      <p className="source">
        {caption}{" "}
        <Link href={`/${lang}/analysis/${season}/${round}/${tool}`}>{t.tools[tool as keyof typeof t.tools].name}</Link>
      </p>
    </div>
  );
}

export function figureComponents(lang: Lang) {
  const t = dict(lang).analysis;

  async function StrategyFigure({ season, round, caption }: { season: number; round: number; caption: string }) {
    const data = await api.strategy(season, round);
    if (!data) return null;
    return (
      <Figure lang={lang} caption={caption} tool="strategy" season={season} round={round}>
        <StrategyChart lang={lang} data={data.data} />
        <details>
          <summary>{t.tableAlt}</summary>
          <StrategyTable lang={lang} data={data.data} />
        </details>
      </Figure>
    );
  }

  async function PaceFigure({ season, round, drivers, caption }: { season: number; round: number; drivers: number[]; caption: string }) {
    const data = await api.pace(season, round);
    if (!data) return null;
    return (
      <Figure lang={lang} caption={caption} tool="pace" season={season} round={round}>
        <PaceChart lang={lang} data={data.data} selected={drivers} showAll={false} />
        <details>
          <summary>{t.tableAlt}</summary>
          <PaceTable lang={lang} data={data.data} selected={drivers} />
        </details>
      </Figure>
    );
  }

  return { StrategyFigure, PaceFigure };
}
