"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, options: { sitekey: string; language?: string }) => string };
  }
}

/**
 * Turnstile (COM-12): verificación anti-bots sin rompecabezas. El script se carga al montar, así que no
 * altera el HTML que hidrata React; la CSP lo autoriza por 'strict-dynamic' (lo crea código con nonce).
 * El widget añade el campo `cf-turnstile-response` al formulario que lo contiene.
 * Con `lazy`, el script no se carga hasta que el visitante toca el formulario: la home no paga su peso.
 */
export function Turnstile({ siteKey, lang, lazy = false }: { siteKey: string; lang: string; lazy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const render = () => {
      if (ref.current && window.turnstile && !ref.current.hasChildNodes()) {
        window.turnstile.render(ref.current, { sitekey: siteKey, language: lang });
      }
    };
    const load = () => {
      if (window.turnstile) return render();
      if (document.querySelector("script[data-turnstile]")) return;
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "";
      script.onload = render;
      document.head.appendChild(script);
    };
    const form = ref.current?.closest("form");
    if (!lazy || !form) return load();
    const start = () => {
      form.removeEventListener("focusin", start);
      form.removeEventListener("pointerdown", start);
      load();
    };
    form.addEventListener("focusin", start);
    form.addEventListener("pointerdown", start);
    return () => {
      form.removeEventListener("focusin", start);
      form.removeEventListener("pointerdown", start);
    };
  }, [siteKey, lang, lazy]);
  return <div ref={ref} className="turnstile" />;
}
