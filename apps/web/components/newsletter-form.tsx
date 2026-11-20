import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { DemoForm } from "./demo-form";

/**
 * Newsletter sign-up (NUC-10) as a demonstration (D-33): Paddock Notes is a portfolio project and the form
 * neither stores nor sends anything. Submitting it opens a notice that explains this and clears the field.
 * Without JavaScript, the form goes to the forms route, which discards the data without reading it and
 * returns with the same notice. The consent checkbox stays: the form looks like the real one.
 */
export function NewsletterForm({ lang, back }: { lang: Lang; back: string }) {
  const t = dict(lang).newsletter;
  return (
    <DemoForm action={`/${lang}/forms/newsletter`} className="stack-s" notice={t.demo}>
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
      <p className="muted">{t.privacy}</p>
    </DemoForm>
  );
}
