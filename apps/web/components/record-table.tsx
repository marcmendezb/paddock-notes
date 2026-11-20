import type { Lang, RecordEntry } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { DriverLink } from "./links";

/** A record's table as a timing screen: the value with a bar proportional to the first. */
export function RecordTable({ lang, rows, label }: { lang: Lang; rows: RecordEntry[]; label: string }) {
  const t = dict(lang).records.cols;
  const hasDetail = rows.some((r) => r.detail);
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="timing" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
        <table className="timing-table">
          <thead>
            <tr>
              <th scope="col" className="num">{t.rank}</th>
              <th scope="col">{t.driver}</th>
              <th scope="col" className="st-points-col">{t.value}</th>
              {hasDetail ? <th scope="col">{t.detail}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.driver.id}-${i}`} className={r.rank <= 3 ? `is-p${r.rank}` : undefined}>
                <td className="num timing-pos">{r.rank}</td>
                <th scope="row" className="timing-driver">
                  <span className="timing-who">
                    <DriverLink lang={lang} driver={r.driver} />
                  </span>
                </th>
                <td className="st-points">
                  <span className="st-points-inner">
                    <span className="st-points-n tabular">{formatPoints(lang, r.value)}</span>
                    <svg className="timing-bar" aria-hidden="true" focusable="false">
                      <rect x="0" y="0" width="100%" height="100%" className="timing-bar-rail" />
                      <rect x="0" y="0" width={`${((r.value / top) * 100).toFixed(2)}%`} height="100%" className={i === 0 ? "timing-bar-win" : "timing-bar-fill"} />
                    </svg>
                  </span>
                </td>
                {hasDetail ? <td className="tabular rec-detail">{r.detail ?? ""}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
