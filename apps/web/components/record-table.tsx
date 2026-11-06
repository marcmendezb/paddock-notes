import type { Lang, RecordEntry } from "@paddock/shared";
import { formatPoints } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { DriverLink } from "./links";

export function RecordTable({ lang, rows, label }: { lang: Lang; rows: RecordEntry[]; label: string }) {
  const t = dict(lang).records.cols;
  const hasDetail = rows.some((r) => r.detail);
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.rank}</th>
            <th scope="col">{t.driver}</th>
            <th scope="col" className="num">{t.value}</th>
            {hasDetail ? <th scope="col">{t.detail}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.driver.id}-${i}`}>
              <td className="num">{r.rank}</td>
              <th scope="row">
                <DriverLink lang={lang} driver={r.driver} />
              </th>
              <td className="num">{formatPoints(lang, r.value)}</td>
              {hasDetail ? <td className="tabular">{r.detail ?? ""}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
