"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Both layers rise and cover (0.34 s + 0.07 s offset)… */
const COVER_MS = 410;
/** …and keep rising to reveal the new page (0.46 s + 0.08 s). */
const REVEAL_MS = 560;
/** If the new page does not arrive, the curtain lifts anyway. */
const GIVE_UP_MS = 10_000;

type Phase = "idle" | "cover" | "reveal";

/**
 * A curtain between pages, in two layers: on clicking an internal link, one layer in each accent rises
 * instantly from the bottom, the second right behind the first, and covers the page while the new one
 * loads underneath (already prefetched). If it takes a while, the brand's dot pulses in the centre. As soon
 * as the new page is painted, both keep rising and reveal it: the front one leaves first and lets a strip
 * of the other through. Each navigation alternates which accent is in front. The header stays on top.
 *
 * Only links within the site to another route, with a normal click (no Ctrl/Cmd or new tab). Without
 * JavaScript, with "reduce motion" or on back and forward, navigation is the usual one.
 */
export function RouteCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [tone, setTone] = useState<1 | 2>(1);
  const count = useRef(0);
  const waiting = useRef(false);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const reveal = () => {
      if (!waiting.current) return;
      waiting.current = false;
      setPhase("reveal");
      lap();
      later(() => setPhase("idle"), REVEAL_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      // Language change: a full load, without the curtain.
      if (link.hasAttribute("hreflang")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (/^\/(api|media|fonts|brand|video|og-fonts)\//.test(url.pathname)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      event.preventDefault();
      event.stopPropagation();
      const href = url.pathname + url.search + url.hash;
      router.prefetch(href);
      count.current += 1;
      setTone(count.current % 2 === 1 ? 1 : 2);
      setPhase("cover");
      waiting.current = true;
      later(() => router.push(href), COVER_MS);
      later(reveal, GIVE_UP_MS);
    };

    document.addEventListener("click", onClick, true);
    const pending = timers.current;
    return () => {
      document.removeEventListener("click", onClick, true);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, [router]);

  // New page painted: two frames so the browser has it ready underneath, and away with the curtain.
  useEffect(() => {
    if (!waiting.current) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        waiting.current = false;
        setPhase("reveal");
        lap();
        later(() => setPhase("idle"), REVEAL_MS);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname]);

  return (
    <div className={`curtain curtain-${tone} is-${phase}`} aria-hidden="true">
      <div className="curtain-layer curtain-back" />
      <div className="curtain-layer curtain-front" />
    </div>
  );
}

/** The header logo does its lap on arriving at the new page. */
function lap() {
  const logo = document.querySelector<HTMLElement>(".site-header .logo");
  if (!logo) return;
  logo.classList.remove("is-lapping");
  void logo.offsetWidth; // restarts the animation if it was already running
  logo.classList.add("is-lapping");
  window.setTimeout(() => logo.classList.remove("is-lapping"), 1200);
}
