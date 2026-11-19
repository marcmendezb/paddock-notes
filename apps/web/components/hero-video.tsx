"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Versionados (el nombre cambia con el contenido, así que se cachean un año) y servidos por /media, que
 * admite peticiones por rangos: Safari en iPhone las necesita para reproducir vídeo.
 */
const SOURCES = { wide: "/media/hero-v1-720.mp4", narrow: "/media/hero-v1-480.mp4" };

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Vídeo de fondo del hero: grabado desde la grada, en blanco y negro, sin sonido y recortado para que no
 * aparezca ninguna marca (contenido.md §13). Decorativo y oscurecido por el velo del hero.
 *
 * Carga sin estorbar a la página: el HTML no lo pide; se le da la fuente cuando la página ya ha cargado
 * (versión de 480 px en pantallas estrechas) y aparece con un fundido solo cuando puede reproducirse sin
 * cortes. Hasta entonces, negro. Con ahorro de datos o conexión 2G no se carga.
 * Sin botón de pausa por decisión del autor (D-33, excepción a WCAG 2.2.2): con movimiento reducido no se
 * reproduce y se queda quieto en su primer fotograma.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    const pick = () => setSrc(window.matchMedia("(max-width: 760px)").matches ? SOURCES.narrow : SOURCES.wide);
    if (document.readyState === "complete") {
      pick();
      return;
    }
    window.addEventListener("load", pick, { once: true });
    return () => window.removeEventListener("load", pick);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = () => {
      setReady(true);
      if (reduced) video.pause();
      else void video.play().catch(() => undefined);
    };
    // canplaythrough: el navegador calcula que puede reproducirlo entero sin pararse a cargar.
    if (video.readyState >= 4) show();
    else video.addEventListener("canplaythrough", show, { once: true });
    return () => video.removeEventListener("canplaythrough", show);
  }, [src]);

  return (
    <>
      {/* Marco que recorta: el vídeo se mueve dentro (paralaje) y el velo lo cubre siempre entero. */}
      <div className="hero-media" aria-hidden="true">
      <video
        ref={ref}
        className={ready ? "hero-video is-ready" : "hero-video"}
        src={src ?? undefined}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      />
      </div>
    </>
  );
}
