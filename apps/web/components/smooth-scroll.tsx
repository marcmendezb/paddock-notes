"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

let active: Lenis | null = null;

/** Lo que tapan las barras fijas: la cabecera y, en carrera y circuito, el subencabezado; más aire. */
export function anchorOffset(): number {
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-total")) || 112;
  const sub = document.querySelector<HTMLElement>(".rsub");
  return header + (sub ? sub.offsetHeight : 0) + 20;
}

/**
 * Posición absoluta en el documento sumando offsetTop: no getBoundingClientRect, que incluye las
 * transformaciones de las animaciones de entrada y da otra posición mientras la sección aún no ha entrado.
 */
export function documentTop(el: HTMLElement): number {
  let y = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) y += node.offsetTop;
  return y;
}

/** Lleva una sección justo por debajo de las barras fijas, con Lenis si está activo. */
export function scrollToAnchor(el: HTMLElement) {
  const top = Math.max(0, documentTop(el) - anchorOffset());
  if (active) active.scrollTo(top, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/**
 * Desplazamiento suave con Lenis en toda la web. No se activa con movimiento reducido (el scroll sigue
 * siendo el del sistema) y deja en paz las zonas con scroll propio: tablas anchas y el menú de móvil.
 * Al cambiar de página, vuelve arriba sin animación, como haría el navegador. Un enlace a la página en la
 * que ya se está (el logo en la home, «Volver a la salida» en el pie) sube hasta arriba deslizándose.
 * Las anclas (#seccion) las lleva este componente y no Lenis: Lenis no cancela el salto nativo, resta dos
 * veces el margen y mide con las transformaciones de las animaciones; acababa en otra sección.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      autoRaf: true,
      // Más inercia que el valor por defecto: el scroll se desliza y se posa, sin frenazos.
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

  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      // Ancla en la misma página: se cancela el salto nativo y se desliza hasta debajo de las barras.
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash && url.hash !== "#top") {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!target) return;
        // Sin stopPropagation: la pestaña del subencabezado escucha el mismo clic.
        event.preventDefault();
        scrollToAnchor(target);
        history.replaceState(history.state, "", url.hash);
        target.focus({ preventScroll: true });
        return;
      }
      const toTop = url.hash === "#top" || (url.origin === location.origin && url.pathname === location.pathname && !url.hash);
      if (!toTop || url.pathname !== location.pathname) return;
      // Antes que el enlace de Next (fase de captura): no navega, solo sube.
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
