import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ token?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  return { title: dict(lang).newsletter.unsubscribeTitle, robots: { index: false } };
}

/** Baja desde el enlace del pie de cada email (D-16). Los clientes de correo usan la baja en un clic de la API; aquí, un botón. */
export default async function UnsubscribePage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { token = "" } = await searchParams;
  const t = dict(lang).newsletter;
  const valid = /^[a-f0-9]{48}$/.test(token);
  return (
    <>
      <PageHero icon="book" size="m" kicker="Newsletter" title={t.unsubscribeTitle} />
    <div className="container stack-l prose">
      {valid ? (
        <form action={`/${lang}/forms/unsubscribe`} method="post" className="stack">
          <p>{t.unsubscribeLede}</p>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="back" value="newsletter" />
          <button type="submit">{t.unsubscribe}</button>
        </form>
      ) : (
        <p className="notice" role="alert">
          {t.badLink}
        </p>
      )}
    </div>
    </>
  );
}
