"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Versioned (the name changes with the content, so they are cached for a year) and served by /media, which
 * supports range requests: Safari on iPhone needs them to play video.
 */
const SOURCES = { wide: "/media/hero-v1-720.mp4", narrow: "/media/hero-v1-480.mp4" };

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * The hero's background video: filmed from the grandstand, in black and white, silent and cropped so no
 * brand appears (content.md §13). Decorative and darkened by the hero's overlay.
 *
 * It loads without getting in the page's way: the HTML does not request it; it gets its source once the
 * page has loaded (a 480 px version on narrow screens) and fades in only when it can play without
 * stalling. Until then, black. With data saver or a 2G connection it is not loaded.
 * No pause button, by the author's decision (D-33, an exception to WCAG 2.2.2): with reduced motion it does
 * not play and stays still on its first frame.
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
    // canplaythrough: the browser estimates it can play the whole thing without stopping to load.
    if (video.readyState >= 4) show();
    else video.addEventListener("canplaythrough", show, { once: true });
    return () => video.removeEventListener("canplaythrough", show);
  }, [src]);

  return (
    <>
      {/* A clipping frame: the video moves inside it (parallax) and the overlay always covers it entirely. */}
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
