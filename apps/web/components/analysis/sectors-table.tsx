import type { SectorsData } from "@paddock/analysis";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { localeOf } from "@/lib/format";

/** Sectores (TEC-06): diferencia con el mejor de cada sector; el signo siempre acompaña al color. */
export function SectorsTable({ lang, data, mode }: { lang: Lang; data: SectorsData; mode: "best" | "average" }) {
  const t = dict(lang).analysis;
  const fmt = new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const reference = [0, 1, 2].map((i) => {
    const values = data.drivers.map((d) => d[mode][i]).filter((v): v is number => v !== null && v !== undefined);
    return values.length ? Math.min(...values) : null;
  });
  const level = (gap: number) => (gap <= 0.0005 ? 0 : gap < 0.15 ? 1 : gap < 0.4 ? 2 : 3);

  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.tools.sectors.name}>
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">{t.drivers}</th>
            {[1, 2, 3].map((s) => (
              <th key={s} scope="col" className="num">
                S{s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.drivers.map((d) => (
            <tr key={d.number}>
              <th scope="row">{d.name}</th>
              {[0, 1, 2].map((i) => {
                const v = d[mode][i];
                const ref = reference[i];
                if (v === null || v === undefined || ref === null || ref === undefined) return <td key={i}>—</td>;
                const gap = v - ref;
                return (
                  <td key={i} className={`num gap-${level(gap)}`}>
                    {gap <= 0.0005 ? fmt.format(v) : `+${fmt.format(gap)}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
