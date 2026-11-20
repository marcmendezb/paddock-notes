"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Lang } from "@paddock/shared";

/** The "/" keyboard shortcut to open search (TRA-03), except while typing in a field. */
export function SearchShortcut({ lang }: { lang: Lang }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      router.push(`/${lang}/search`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lang, router]);
  return null;
}
