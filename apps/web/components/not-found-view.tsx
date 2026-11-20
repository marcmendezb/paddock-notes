import Link from "next/link";
import { headers } from "next/headers";
import { DEFAULT_LANG, isLang, type Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/** The request's language, set by middleware.ts in the internal x-lang header. */
export async function requestLang(): Promise<Lang> {
  const value = (await headers()).get("x-lang") ?? DEFAULT_LANG;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** The 404 page in the URL's language (TRA-14). */
export function NotFoundView({ lang }: { lang: Lang }) {
  const t = dict(lang).error;
  return (
    <div className="container stack">
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundBody}</p>
      <p>
        <Link href={`/${lang}/races`}>{dict(lang).nav.races}</Link> · <Link href={`/${lang}`}>{t.home}</Link>
      </p>
    </div>
  );
}
