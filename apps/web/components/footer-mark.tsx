"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * El símbolo grande del pie se inclina en 3D hacia el cursor mientras este pasa por el pie. Los ángulos se
 * fijan con el CSSOM (style.setProperty), que la CSP permite (D-04). Sin ratón fino o con «reducir
 * movimiento», se queda quieto.
 */
export function FooterMark({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const footer = el?.closest("footer");
    if (!el || !footer) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const x = (event.clientX - (box.left + box.width / 2)) / window.innerWidth;
        const y = (event.clientY - (box.top + box.height / 2)) / window.innerHeight;
        el.style.setProperty("--tilt-y", `${(x * 22).toFixed(2)}deg`);
        el.style.setProperty("--tilt-x", `${(-y * 16).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      el.style.setProperty("--tilt-y", "0deg");
      el.style.setProperty("--tilt-x", "0deg");
    };
    footer.addEventListener("pointermove", move);
    footer.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      footer.removeEventListener("pointermove", move);
      footer.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className="ft-tilt">
      {children}
    </div>
  );
}
