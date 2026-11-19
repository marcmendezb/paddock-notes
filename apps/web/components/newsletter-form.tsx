"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/**
 * Alta en la newsletter (NUC-10) como demostración (D-33): Paddock Notes es un proyecto de portfolio y
 * el formulario no guarda ni envía nada. Al enviarlo se abre un aviso que lo explica y el campo se vacía.
 * Sin JavaScript, el formulario va a la ruta de formularios, que descarta los datos sin leerlos y vuelve
 * con el mismo aviso. La casilla de consentimiento se mantiene: el formulario se ve como el real.
 */
export function NewsletterForm({ lang, back }: { lang: Lang; back: string }) {
  const t = dict(lang).newsletter;
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <form
        ref={form}
        action={`/${lang}/forms/newsletter`}
        method="post"
        className="stack-s"
        onSubmit={(event) => {
          event.preventDefault();
          form.current?.reset();
          dialog.current?.showModal();
        }}
      >
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
      </form>
      <dialog ref={dialog} className="demo-dialog" data-surface="ink" aria-labelledby={`demo-title-${back}`}>
        <form method="dialog" className="demo-dialog-body">
          <p className="demo-dialog-kicker">Paddock Notes</p>
          <h2 id={`demo-title-${back}`} className="demo-dialog-title">
            {t.demo.title}
          </h2>
          <p className="demo-dialog-text">{t.demo.text}</p>
          <button type="submit" className="cmp-go" autoFocus>
            {t.demo.close}
          </button>
        </form>
      </dialog>
    </>
  );
}
