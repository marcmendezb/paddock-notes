"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Lang } from "@paddock/shared";

/**
 * The "/" keyboard shortcut (TRA-03), except while typing in a field: it focuses the header's search box
 * when it is on screen, and otherwise opens the search page.
 */
export function SearchShortcut({ lang }: { lang: Lang }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      const box = [...document.querySelectorAll<HTMLInputElement>(".hsearch input")].find((el) => el.offsetParent !== null);
      if (box) {
        box.focus();
        box.select();
      }
      else router.push(`/${lang}/search`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lang, router]);
  return null;
}
