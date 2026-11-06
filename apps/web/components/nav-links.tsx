"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@paddock/shared";

/** Navegación principal con la página actual marcada con aria-current (TRA-01). */
export function NavLinks({ lang, items }: { lang: Lang; items: { href: string; label: string }[] }) {
  const pathname = usePathname() ?? "";
  return (
    <ul className="nav-list">
      {items.map((item) => {
        const href = `/${lang}${item.href}`;
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={item.href}>
            <Link href={href} aria-current={current ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
