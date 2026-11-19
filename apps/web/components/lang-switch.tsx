"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LANGS, type Lang } from "@paddock/shared";

/** Nombre de cada idioma en su propio idioma: así lo reconoce quien lo habla. */
export const LANG_NAMES: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };

/**
 * Banderas en SVG (no emoji: en Windows los emoji de bandera salen como letras). Colores como atributos,
 * permitidos por la CSP (D-04). Decorativas: el nombre del idioma va siempre en texto.
 */
function Flag({ lang }: { lang: Lang }) {
  if (lang === "es") {
    return (
      <svg className="flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }
  if (lang === "de") {
    return (
      <svg className="flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
        <rect width="30" height="20" fill="#FFCE00" />
        <rect width="30" height="13.34" fill="#DD0000" />
        <rect width="30" height="6.67" fill="#000000" />
      </svg>
    );
  }
  return (
    <svg className="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

/**
 * Selector de idioma (TRA-12): un desplegable con la bandera y el código del idioma actual; al abrirlo,
 * los tres idiomas con su bandera y su nombre. Cada enlace cambia solo el prefijo y conserva la página;
 * es una carga completa, para que cambie también el idioma del documento.
 * Es un <details>: funciona sin JavaScript. Con JavaScript, además se cierra al pulsar fuera, con Escape
 * y al cambiar de página. `up` lo abre hacia arriba (pie de página).
 */
export function LangSwitch({ current, label, up = false }: { current: Lang; label: string; up?: boolean }) {
  const pathname = usePathname() ?? "/";
  const rest = pathname.replace(/^\/(es|en|de)(?=\/|$)/, "");
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = (event: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        el.open = false;
        el.querySelector("summary")?.focus();
        return;
      }
      if (!el.contains(event.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className={up ? "lang-switch is-up" : "lang-switch"}>
      <summary aria-label={`${label}: ${LANG_NAMES[current]}`}>
        <Flag lang={current} />
        <span className="lang-code">{current.toUpperCase()}</span>
        <svg className="lang-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </summary>
      <ul className="lang-menu" aria-label={label}>
        {LANGS.map((lang) => (
          <li key={lang}>
            {/* Enlace normal, no de Next: cambiar de idioma recarga la página entera (cambia <html lang>). */}
            <a href={`/${lang}${rest}`} hrefLang={lang} lang={lang} aria-current={lang === current ? "true" : undefined}>
              <Flag lang={lang} />
              <span>{LANG_NAMES[lang]}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
