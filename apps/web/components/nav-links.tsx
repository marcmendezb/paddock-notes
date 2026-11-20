"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@paddock/shared";

export interface NavItem {
  href: string;
  label: string;
  /** A line saying what is inside (mobile menu). */
  teaser: string;
  /** A panel with real data that opens on hover or when tabbing in (desktop). */
  panel?: ReactNode;
  /** A wide panel, centred under the whole navigation instead of under its link. */
  wide?: boolean;
}

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Main desktop navigation (TRA-01): a lime block slides under the section being pointed at or focused and
 * returns to the current one (aria-current) on leave; the text turns black on top of it. Without
 * JavaScript, the current section is marked the same way in lime with CSS. Each section opens a panel with
 * data on hover or when tabbing; Escape closes it (WCAG 1.4.13).
 *
 * The block's position is set through the CSSOM (style.transform), which the CSP allows: there are no style
 * attributes in the HTML (D-04).
 */
export function NavLinks({ lang, items }: { lang: Lang; items: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const ref = useRef<HTMLUListElement>(null);
  const puck = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pointed, setPointed] = useState<number | null>(null);
  const currentIndex = items.findIndex((item) => isCurrent(pathname, `/${lang}${item.href}`));
  const target = pointed ?? (currentIndex >= 0 ? currentIndex : null);

  // Clicking a link in the navigation or in a panel closes the panel (it does not open again until another
  // section is entered). In the capture phase: the transition curtain stops the click before React.
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

  // Places the block under the link pointed at (or the current one); if there is none, it shrinks it.
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
            // Entering another section (with the mouse or the tab key) allows the panels again.
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
 * Full-screen mobile menu: a <details>, so it opens and closes without JavaScript. With JavaScript, it
 * also closes on navigation and with Escape.
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
