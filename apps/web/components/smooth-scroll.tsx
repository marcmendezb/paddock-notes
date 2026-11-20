"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let active: Lenis | null = null;

/** What the sticky bars cover: the header and, on race and circuit pages, the sub-navigation; plus breathing room. */
export function anchorOffset(): number {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-total")) || 112;
  const sub = document.querySelector<HTMLElement>(".rsub");
  // On a phone on its side the sub-navigation scrolls with the page (globals.css) and covers nothing.
  const covering = sub && getComputedStyle(sub).position === "sticky" ? sub.offsetHeight : 0;
  return header + covering + 20;
}

/**
 * Absolute position in the document by summing offsetTop: not getBoundingClientRect, which includes the
 * entrance animations' transforms and gives another position while the section has not come in yet.
 */
export function documentTop(el: HTMLElement): number {
  let y = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) y += node.offsetTop;
  return y;
}

/** Brings a section just below the sticky bars, with Lenis if it is active. */
export function scrollToAnchor(el: HTMLElement) {
  const top = Math.max(0, documentTop(el) - anchorOffset());
  if (active) active.scrollTo(top, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/**
 * Smooth scrolling with Lenis across the site. It is not turned on with reduced motion (scrolling stays
 * the system's) and it leaves areas with their own scroll alone: wide tables and the mobile menu.
 * On a page change it goes back to the top without animation, as the browser would. A link to the current
 * page (the logo on the home page, "Back to the start" in the footer) glides up to the top.
 * The URL keeps no "#": it scrolls to the section and the address stays clean.
 * Anchors (#section) are handled by this component, not by Lenis: Lenis does not cancel the native jump,
 * subtracts the margin twice and measures with the animations' transforms; it ended up on another section.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      autoRaf: true,
      // More inertia than the default: the scroll glides and settles, without sudden stops.
      lerp: 0.075,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      stopInertiaOnNavigate: true,
      prevent: (node) => Boolean(node.closest(".table-wrap, .menu-sheet, .nav-panel")),
    });
    lenis.current = instance;
    active = instance;
    return () => {
      instance.destroy();
      lenis.current = null;
      active = null;
    };
  }, []);

  // On a page change, to the top; if it arrives with an anchor (/circuits/x#guide), to that section, and the
  // URL stays clean, without "#": the anchor only serves to get there.
  useEffect(() => {
    const id = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
    const target = id && id !== "top" ? document.getElementById(id) : null;
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    if (target) {
      requestAnimationFrame(() => scrollToAnchor(target));
      return;
    }
    lenis.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      // An anchor on the same page: the native jump is cancelled and it glides to just below the bars.
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash && url.hash !== "#top") {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!target) return;
        // No stopPropagation: the sub-navigation tab listens to the same click.
        event.preventDefault();
        scrollToAnchor(target);
        target.focus({ preventScroll: true });
        return;
      }
      const toTop = url.hash === "#top" || (url.origin === location.origin && url.pathname === location.pathname && !url.hash);
      if (!toTop || url.pathname !== location.pathname) return;
      // Before Next's link (capture phase): it does not navigate, it only scrolls up.
      event.preventDefault();
      event.stopPropagation();
      if (lenis.current) lenis.current.scrollTo(0, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      document.getElementById("content")?.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
