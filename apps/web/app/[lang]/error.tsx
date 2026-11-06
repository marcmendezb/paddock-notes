"use client";

import { useParams } from "next/navigation";
import { DEFAULT_LANG, isLang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/** Página 500 en el idioma de la URL (TRA-14). Nunca muestra trazas ni mensajes internos. */
export default function LangError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang && isLang(params.lang) ? params.lang : DEFAULT_LANG;
  const t = dict(lang).error;
  return (
    <div className="container stack">
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <p>
        <button type="button" onClick={reset}>
          {t.retry}
        </button>
      </p>
    </div>
  );
}
