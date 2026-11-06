import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ token?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return { title: dict(lang).newsletter.confirmTitle, robots: { index: false } };
}

/** Confirmación de la newsletter (CON-06): un botón y no el propio enlace, para que los escáneres de correo no confirmen por el usuario. */
export default async function NewsletterConfirmPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { token = "" } = await searchParams;
  const t = dict(lang).newsletter;
  const valid = /^[a-f0-9]{48}$/.test(token);
  return (
    <div className="container stack-l prose">
      <h1>{t.confirmTitle}</h1>
      {valid ? (
        <form action={`/${lang}/forms/newsletter-confirm`} method="post" className="stack">
          <p>{t.confirmLede}</p>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="back" value="newsletter" />
          <button type="submit">{t.confirm}</button>
        </form>
      ) : (
        <p className="notice" role="alert">
          {t.badLink}
        </p>
      )}
    </div>
  );
}
