import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ token?: string }> };

export const metadata: Metadata = { robots: { index: false } };

/** Enlace de invitación: unirse es una acción explícita (POST), nunca un GET que cambie datos. */
export default async function JoinLeaguePage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const token = (await searchParams).token ?? "";
  const t = dict(lang);
  const me = await currentUser();
  return (
    <div className="container stack-l prose">
      <h1>{t.league.joinTitle}</h1>
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
  );
}
