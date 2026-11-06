import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/form-message";
import { NewsletterForm } from "@/components/newsletter-form";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ msg?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).newsletter;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/newsletter`, languages: { es: "/es/newsletter", en: "/en/newsletter" } },
  };
}

/** Newsletter semanal (CON-06, NUC-10): qué trae y alta con doble confirmación. */
export default async function NewsletterPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { msg } = await searchParams;
  const t = dict(lang).newsletter;
  return (
    <div className="container stack-l prose">
      <h1>{t.title}</h1>
      <p className="lede">{t.lede}</p>
      <ul>
        {t.contents.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <FormMessage lang={lang} msg={msg} />
      <NewsletterForm lang={lang} back="newsletter" />
      <p className="source">
        <Link href={`/${lang}/privacy`}>{dict(lang).footer.privacy}</Link>
      </p>
    </div>
  );
}
