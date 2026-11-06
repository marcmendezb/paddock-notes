"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@paddock/shared";

/** Cambia solo el prefijo de idioma y conserva la página actual (TRA-12). */
export function LangSwitch({ target, label }: { target: Lang; label: string }) {
  const pathname = usePathname() ?? "/";
  const rest = pathname.replace(/^\/(es|en)(?=\/|$)/, "");
  return (
    <Link href={`/${target}${rest}`} hrefLang={target} lang={target} className="lang-switch" prefetch={false}>
      {label}
    </Link>
  );
}
