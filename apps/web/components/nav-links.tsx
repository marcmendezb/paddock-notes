"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@paddock/shared";

export interface NavItem {
  href: string;
  label: string;
  /** Una línea que dice qué hay dentro (menú móvil). */
  teaser: string;
  /** Panel con datos reales que se abre al pasar por encima o al llegar con el tabulador (escritorio). */
  panel?: ReactNode;
  /** Panel ancho, centrado bajo toda la navegación en vez de bajo su enlace. */
  wide?: boolean;
}

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Navegación principal de escritorio (TRA-01): un bloque lima se desliza bajo la sección que se señala o
 * enfoca y vuelve a la actual (aria-current) al salir; el texto pasa a negro encima. Sin JavaScript, la
 * sección actual se marca igual en lima con CSS. Cada sección abre un panel con datos al pasar por encima
 * o al tabular; Escape lo cierra (WCAG 1.4.13).
 *
 * La posición del bloque se fija con el CSSOM (style.transform), que la CSP permite: no hay atributos
 * style en el HTML (D-04).
 */
export function NavLinks({ lang, items }: { lang: Lang; items: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const ref = useRef<HTMLUListElement>(null);
  const puck = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pointed, setPointed] = useState<number | null>(null);
  const currentIndex = items.findIndex((item) => isCurrent(pathname, `/${lang}${item.href}`));
  const target = pointed ?? (currentIndex >= 0 ? currentIndex : null);

  // Al pulsar un enlace de la navegación o de un panel, el panel se cierra (no vuelve a abrirse hasta
  // entrar en otra sección). En fase de captura: la cortina de transición detiene el clic antes de React.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(".nav-panel a, .nav-link");
      if (!link || !ref.current?.contains(link)) return;
      setDismissed(true);
      setPointed(null);
      (document.activeElement as HTMLElement | null)?.blur();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !ref.current?.contains(document.activeElement ?? null)) return;
      setDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Coloca el bloque bajo el enlace señalado (o el actual); si no hay ninguno, lo encoge.
  useEffect(() => {
    const list = ref.current;
    const block = puck.current;
    if (!list || !block) return;
    const place = () => {
      const link = target === null ? null : list.querySelectorAll<HTMLElement>(".nav-link")[target];
      if (!link) {
        block.style.opacity = "0";
        delete list.dataset.ready;
        return;
      }
      const box = link.getBoundingClientRect();
      const origin = list.getBoundingClientRect();
      block.style.opacity = "1";
      list.dataset.ready = "";
      block.style.transform = `translateX(${box.left - origin.left}px) scaleX(${box.width / 100})`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [target, pathname]);

  return (
    <ul
      ref={ref}
      className={dismissed ? "nav-list has-puck is-dismissed" : "nav-list has-puck"}
      onMouseLeave={() => {
        setDismissed(false);
        setPointed(null);
      }}
      onBlur={(event) => {
        if (!ref.current?.contains(event.relatedTarget as Node | null)) setPointed(null);
      }}
    >
      <span ref={puck} className="nav-puck" aria-hidden="true" />
      {items.map((item, i) => {
        const href = `/${lang}${item.href}`;
        const current = i === currentIndex;
        return (
          <li
            key={item.href}
            className={`nav-item${target === i ? " is-target" : ""}${item.wide ? " has-mega" : ""}`}
            // Entrar en otra sección (con el ratón o el tabulador) vuelve a permitir los paneles.
            onMouseEnter={() => {
              setPointed(i);
              setDismissed(false);
            }}
            onFocus={() => {
              setPointed(i);
              setDismissed(false);
            }}
          >
            <Link href={href} aria-current={current ? "page" : undefined} className="nav-link">
              {item.label}
            </Link>
            {item.panel ? <div className={item.wide ? "nav-panel nav-panel-mega" : "nav-panel"}>{item.panel}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Menú de móvil a pantalla completa: un <details>, así que abre y cierra sin JavaScript. Con JavaScript,
 * además se cierra al navegar y con Escape.
 */
export function MobileMenu({
  lang,
  items,
  labels,
  footer,
}: {
  lang: Lang;
  items: NavItem[];
  labels: { open: string; close: string };
  footer: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <details ref={ref} className="menu">
      <summary className="menu-toggle">
        <span className="menu-icon" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="menu-label-open">{labels.open}</span>
        <span className="menu-label-close">{labels.close}</span>
      </summary>
      <div className="menu-sheet">
        <ul className="menu-list">
          {items.map((item) => {
            const href = `/${lang}${item.href}`;
            return (
              <li key={item.href}>
                <Link href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined} className="menu-link">
                  <span className="menu-name">{item.label}</span>
                  <span className="menu-teaser">{item.teaser}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="menu-footer">{footer}</div>
      </div>
    </details>
  );
}
