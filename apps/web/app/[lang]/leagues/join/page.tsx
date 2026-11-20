import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ token?: string }> };

export const metadata: Metadata = { robots: { index: false } };

/** The invitation link: joining is an explicit action (POST), never a GET that changes data. */
export default async function JoinLeaguePage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const token = (await searchParams).token ?? "";
  const t = dict(lang);
  const me = await currentUser();
  return (
    <>
      <PageHero icon="trophy" size="m" kicker={t.predictions.title} title={t.league.joinTitle} />
    <div className="container stack-l prose">
      {!me ? (
        <p>
          <Link href={`/${lang}/account`}>{t.predictions.signInFirst}</Link>
        </p>
      ) : (
        <form action={`/${lang}/forms/league-join`} method="post">
          <input type="hidden" name="token" value={/^[a-f0-9]{48}$/.test(token) ? token : ""} />
          <input type="hidden" name="back" value="account" />
          <button type="submit">{t.league.joinButton}</button>
        </form>
      )}
    </div>
    </>
  );
}
