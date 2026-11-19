import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { Turnstile } from "./turnstile";

/**
 * Alta en la newsletter en una línea (NUC-10). Sin JavaScript el formulario se ve, pero la verificación
 * anti-bots no puede completarse: lo decimos en lugar de fallar en silencio. La casilla de consentimiento,
 * con enlace a la política de privacidad, es obligatoria aquí y en la API.
 */
export async function NewsletterForm({ lang, back, lazy = false }: { lang: Lang; back: string; lazy?: boolean }) {
  const t = dict(lang).newsletter;
  const { env } = await getCloudflareContext({ async: true });
  return (
    <form action={`/${lang}/forms/newsletter`} method="post" className="stack-s">
      <input type="hidden" name="back" value={back} />
      <div className="inline-form">
        <label>
          {t.email}
          <input type="email" name="email" required autoComplete="email" maxLength={200} />
        </label>
        <button type="submit">{t.subscribe}</button>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {t.consent.before}{" "}
          <Link href={`/${lang}/privacy`}>{t.consent.link}</Link>
          {t.consent.after}
        </span>
      </label>
      <Turnstile siteKey={env.TURNSTILE_SITE_KEY} lang={lang} lazy={lazy} />
      <noscript>
        <p className="muted">{t.needsJs}</p>
      </noscript>
      <p className="muted">{t.privacy}</p>
    </form>
  );
}
