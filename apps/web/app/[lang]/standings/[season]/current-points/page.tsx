import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverLink } from "@/components/links";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
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
      languages: { es: `/es/standings/${season}/current-points`, en: `/en/standings/${season}/current-points`, de: `/de/standings/${season}/current-points` },
    },
  };
}

/** Points recalculated under today's system (HIS-06), always labelled as a recalculation. */
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
    <>
      <PageHero icon="layers" size="m" kicker={t.recalc.label} title={t.recalc.title(season)} lede={<p>{t.recalc.lede}</p>} />
    <div className="container stack-xl">
      <div className="stack-s prose">
        {champion && actualChampion ? (
          <p className="auto-note">
            {champion.driver.id === actualChampion.driver.id
              ? t.recalc.sameChampion(fullName(champion.driver))
              : t.recalc.newChampion(fullName(champion.driver), fullName(actualChampion.driver))}
          </p>
        ) : null}
        <p className="muted">{t.recalc.counted(data.races, data.sprints)}</p>
      </div>

      <div className="timing" data-surface="ink">
      <div className="table-wrap" tabIndex={0} role="region" aria-label={t.recalc.title(season)}>
        <table className="timing-table">
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
                  <td className="num timing-pos">{r.position}</td>
                  <th scope="row" className="timing-driver">
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
      </div>

      <p>
        <Link href={`/${lang}/standings/${season}`} className="ln-more">
          ← {t.recalc.back(season)}
        </Link>
      </p>
    </div>
    </>
  );
}
