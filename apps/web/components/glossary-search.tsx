"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lang } from "@paddock/shared";

export interface GlossaryItem {
  slug: string;
  term: string;
  def: string;
  group: string;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Buscador del glosario (CON-02): filtra en el navegador al instante. Sin JavaScript se ve la lista
 * completa, agrupada.
 */
export function GlossarySearch({
  lang,
  items,
  groups,
  label,
  empty,
}: {
  lang: Lang;
  items: GlossaryItem[];
  groups: { key: string; label: string }[];
  label: string;
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());
  const filtered = useMemo(
    () => (q ? items.filter((i) => normalize(`${i.term} ${i.def}`).includes(q)) : items),
    [items, q],
  );

  return (
    <div className="stack-l">
      <label className="inline-form">
        <span>{label}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p className="visually-hidden" role="status">
        {filtered.length}
      </p>
      {filtered.length === 0 ? <p>{empty.replace("{q}", query)}</p> : null}
      {groups.map((g) => {
        const inGroup = filtered.filter((i) => i.group === g.key);
        if (inGroup.length === 0) return null;
        return (
          <section key={g.key} className="stack-s" aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="h-small">
              {g.label}
            </h2>
            <dl className="glossary-list">
              {inGroup.map((i) => (
                <div key={i.slug}>
                  <dt>
                    <Link href={`/${lang}/learn/glossary/${i.slug}`}>{i.term}</Link>
                  </dt>
                  <dd>{i.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
