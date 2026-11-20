"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LANGS, type Lang } from "@paddock/shared";

/** Each language's name in its own language: that is how its speakers recognise it. */
export const LANG_NAMES: Record<Lang, string> = { es: "Español", en: "English", de: "Deutsch" };

/**
 * Flags in SVG (not emoji: on Windows, flag emoji render as letters). Colours as attributes, allowed by the
 * CSP (D-04). Decorative: the language name is always in text.
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
 * Language switcher (TRA-12): a dropdown with the flag and code of the current language; opened, the three
 * languages with their flag and name. Each link changes only the prefix and keeps the page; it is a full
 * load, so the document's language changes too.
 * It is a <details>: it works without JavaScript. With JavaScript it also closes on an outside click, with
 * Escape and on a page change, and with a mouse it opens on hover, like the header's dropdowns (with a
 * grace period on leave to cross the gap to the menu). `up` opens it upwards (footer).
 */
export function LangSwitch({ current, label, up = false }: { current: Lang; label: string; up?: boolean }) {
  const pathname = usePathname() ?? "/";
  const rest = pathname.replace(/^\/(es|en|de)(?=\/|$)/, "");
  const ref = useRef<HTMLDetailsElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverable = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const enter = () => {
    if (!hoverable() || !ref.current) return;
    if (closing.current) clearTimeout(closing.current);
    ref.current.open = true;
  };
  const leave = () => {
    if (!hoverable()) return;
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => {
      if (ref.current) ref.current.open = false;
    }, 150);
  };

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
    <details ref={ref} className={up ? "lang-switch is-up" : "lang-switch"} onMouseEnter={enter} onMouseLeave={leave}>
      <summary
        aria-label={`${label}: ${LANG_NAMES[current]}`}
        // With a mouse, a click does not close it: it already opened on hover and closes on leave.
        onClick={(event) => {
          if (hoverable() && ref.current?.open) event.preventDefault();
        }}
      >
        <Flag lang={current} />
        <span className="lang-code">{current.toUpperCase()}</span>
        <svg className="lang-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </summary>
      <ul className="lang-menu" aria-label={label}>
        {LANGS.map((lang) => (
          <li key={lang}>
            {/* A plain link, not Next's: changing the language reloads the whole page (it changes <html lang>). */}
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
