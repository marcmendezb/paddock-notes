import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { gpName } from "@paddock/shared";
import { FormMessage } from "@/components/form-message";
import { PageHero } from "@/components/page-hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { SITE_URL } from "@/lib/site";
import { userGet } from "@/lib/session";

type Props = { params: Promise<{ lang: string; id: string }>; searchParams: Promise<{ msg?: string }> };

interface League {
  id: string;
  name: string;
  isOwner: boolean;
  inviteToken: string | null;
  ranking: { rank: number; name: string; points: number; exact: number }[];
  lastRound: { round: number; gp: string; rows: { name: string; points: number | null; exact: number; pole: boolean }[] } | null;
}

export const metadata: Metadata = { robots: { index: false } };

/** A private league (COM-07): only its members see it; the invitation link, only its creator. */
export default async function LeaguePage({ params, searchParams }: Props) {
  const p = await params;
  const lang = parseLang(p.lang);
  const { msg } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(p.id)) notFound();
  const league = await userGet<League>(`/leagues/${p.id}/${new Date().getUTCFullYear()}`);
  if (!league) notFound();
  const t = dict(lang);
  const back = `leagues/${league.id}`;
  const form = (name: string) => `/${lang}/forms/${name}`;

  return (
    <>
      <PageHero
        icon="trophy"
        size="m"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/account`, label: t.account.title }, { label: league.name }]} />}
        kicker={t.predictions.title}
        title={league.name}
      />
    <div className="container stack-xl prose">
      <div className="stack-s">
        <FormMessage lang={lang} msg={msg} okText={msg?.startsWith("report") ? t.league.reported : undefined} />
      </div>

      <div className="table-wrap" tabIndex={0} role="region" aria-label={league.name}>
        <table>
          <thead>
            <tr>
              <th scope="col" className="num">Pos.</th>
              <th scope="col">{t.account.alias}</th>
              <th scope="col" className="num">{t.predictions.points}</th>
            </tr>
          </thead>
          <tbody>
            {league.ranking.map((r, i) => (
              <tr key={i}>
                <td className="num">{r.rank}</td>
                <th scope="row">{r.name}</th>
                <td className="num">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {league.lastRound ? (
        <section aria-labelledby="last-round" className="stack-s">
          <h2 id="last-round" className="h-small">
            {t.league.lastRound(gpName(lang, league.lastRound.gp))}
          </h2>
          <ul className="link-list">
            {league.lastRound.rows.map((r, i) => (
              <li key={i}>
                <strong>{r.name}</strong>: {r.points === null ? t.league.noPick : t.league.scored(r.points, r.exact, r.pole)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {league.isOwner && league.inviteToken ? (
        <section aria-labelledby="invite" className="stack-s">
          <h2 id="invite" className="h-small">
            {t.league.invite}
          </h2>
          <p className="muted">{t.league.inviteHelp}</p>
          <p className="tabular invite-link">{`${SITE_URL}/${lang}/leagues/join?token=${league.inviteToken}`}</p>
          <form action={form("league-invite")} method="post">
            <input type="hidden" name="id" value={league.id} />
            <input type="hidden" name="back" value={back} />
            <button type="submit">{t.league.rotate}</button>
          </form>
        </section>
      ) : null}

      <div className="inline-form">
        <form action={form("league-leave")} method="post">
          <input type="hidden" name="id" value={league.id} />
          <button type="submit">{t.league.leave}</button>
        </form>
        <form action={form("report")} method="post">
          <input type="hidden" name="kind" value="league" />
          <input type="hidden" name="target" value={league.id} />
          <input type="hidden" name="back" value={back} />
          <button type="submit">{t.league.report}</button>
        </form>
      </div>
    </div>
    </>
  );
}
