import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverLink } from "@/components/links";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang, parseSeason } from "@/lib/params";
import { favoriteSet } from "@/lib/session";

type Props = { params: Promise<{ lang: string; season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const t = dict(lang).recalc;
  return {
    title: t.title(season),
    description: t.description(season),
    alternates: {
      canonical: `/${lang}/standings/${season}/current-points`,
      languages: { es: `/es/standings/${season}/current-points`, en: `/en/standings/${season}/current-points` },
    },
  };
}

/** Puntos recalculados con el sistema actual (HIS-06), siempre rotulados como recálculo. */
export default async function CurrentPointsPage({ params }: Props) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const [res, favorites] = await Promise.all([api.recalculated(season), favoriteSet()]);
  if (!res) notFound();
  const data = res.data;
  const t = dict(lang);
  const champion = data.rows[0];
  const actualChampion = data.rows.find((r) => r.actualPosition === 1);

  return (
    <div className="container stack-xl">
      <div className="stack-s prose">
        <p className="eyebrow">
          <span className="tag tag-accent">{t.recalc.label}</span>
        </p>
        <h1>{t.recalc.title(season)}</h1>
        <p className="lede">{t.recalc.lede}</p>
        {champion && actualChampion ? (
          <p className="auto-note">
            {champion.driver.id === actualChampion.driver.id
              ? t.recalc.sameChampion(fullName(champion.driver))
              : t.recalc.newChampion(fullName(champion.driver), fullName(actualChampion.driver))}
          </p>
        ) : null}
        <p className="muted">{t.recalc.counted(data.races, data.sprints)}</p>
      </div>

      <div className="table-wrap" tabIndex={0} role="region" aria-label={t.recalc.title(season)}>
        <table>
          <caption className="visually-hidden">{t.recalc.label}</caption>
          <thead>
            <tr>
              <th scope="col" className="num">{t.standings.columns.pos}</th>
              <th scope="col">{t.standings.columns.driver}</th>
              <th scope="col" className="num">{t.recalc.columns.recalc}</th>
              <th scope="col" className="num">{t.standings.columns.wins}</th>
              <th scope="col" className="num">{t.recalc.columns.actual}</th>
              <th scope="col">{t.recalc.columns.change}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const change = r.actualPosition === null ? null : r.actualPosition - r.position;
              const fav = favorites.has(`d:${r.driver.id}`);
              return (
                <tr key={r.driver.id} className={fav ? "is-favorite" : undefined}>
                  <td className="num">{r.position}</td>
                  <th scope="row">
                    <DriverLink lang={lang} driver={r.driver} />
                    {fav ? <span className="tag tag-fav">{t.favorite}</span> : null}
                  </th>
                  <td className="num">{formatPoints(lang, r.points)}</td>
                  <td className="num">{r.wins}</td>
                  <td className="num">
                    {r.actualPosition === null ? "—" : `P${r.actualPosition} · ${formatPoints(lang, r.actualPoints ?? 0)}`}
                  </td>
                  <td>{change === null ? "—" : change > 0 ? t.recalc.up(change) : change < 0 ? t.recalc.down(-change) : t.recalc.same}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p>
        <Link href={`/${lang}/standings/${season}`}>{t.recalc.back(season)}</Link>
      </p>
    </div>
  );
}
