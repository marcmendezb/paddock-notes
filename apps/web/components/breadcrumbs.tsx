import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { JsonLd } from "./json-ld";

/** Migas de pan en páginas de segundo nivel o más (TRA-02). La última es la página actual. */
export function Breadcrumbs({ lang, items }: { lang: Lang; items: { href?: string; label: string }[] }) {
  const list = {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };
  return (
    <nav aria-label={dict(lang).breadcrumbs} className="breadcrumbs">
      <JsonLd data={list} />
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
