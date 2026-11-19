"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Las dos capas suben y tapan (0,34 s + 0,07 s de desfase)… */
const COVER_MS = 410;
/** …y siguen subiendo para descubrir la página nueva (0,46 s + 0,08 s). */
const REVEAL_MS = 560;
/** Si la página nueva no llega, la cortina se levanta igual. */
const GIVE_UP_MS = 10_000;

type Phase = "idle" | "cover" | "reveal";

/**
 * Cortina entre páginas, en dos capas: al pulsar un enlace interno, suben al instante desde abajo una
 * capa de cada acento, la segunda pegada a la primera, y tapan la página mientras la nueva se carga por
 * debajo (ya pedida con prefetch). Si tarda, el punto de la marca late en el centro. En cuanto la página
 * nueva está pintada, las dos siguen subiendo y la descubren: la de delante se va primero y deja pasar una
 * franja de la otra. En cada navegación se alterna qué acento va delante. La cabecera queda por encima.
 *
 * Solo enlaces del sitio a otra ruta, con clic normal (ni Ctrl/Cmd ni pestaña nueva). Sin JavaScript, con
 * «reducir movimiento» o al ir atrás y adelante, la navegación es la de siempre.
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
      // Cambio de idioma: carga completa, sin cortina.
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

  // Página nueva pintada: dos fotogramas para que el navegador la tenga lista debajo, y fuera la cortina.
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

/** El logo de la cabecera da su vuelta al llegar a la página nueva. */
function lap() {
  const logo = document.querySelector<HTMLElement>(".site-header .logo");
  if (!logo) return;
  logo.classList.remove("is-lapping");
  void logo.offsetWidth; // reinicia la animación si ya estaba en marcha
  logo.classList.add("is-lapping");
  window.setTimeout(() => logo.classList.remove("is-lapping"), 1200);
}
