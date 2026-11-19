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
 * Buscador del glosario (CON-02): filtra en el navegador al instante, por texto y por categoría (barra
 * fija bajo la cabecera). Los términos, en tarjetas por grupo. Sin JavaScript se ve la lista completa,
 * agrupada (los botones de categoría no hacen nada).
 */
export function GlossarySearch({
  lang,
  items,
  groups,
  label,
  empty,
  allLabel,
}: {
  lang: Lang;
  items: GlossaryItem[];
  groups: { key: string; label: string }[];
  label: string;
  empty: string;
  allLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const q = normalize(query.trim());
  const filtered = useMemo(
    () => items.filter((i) => (!group || i.group === group) && (!q || normalize(`${i.term} ${i.def}`).includes(q))),
    [items, q, group],
  );
  const count = (key: string) => items.filter((i) => i.group === key).length;

  return (
    <div className="gx">
      <div className="gx-bar">
        <label className="gx-search">
          <span className="visually-hidden">{label}</span>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="10" cy="10" r="6" />
            <path d="M14.5 14.5 18.5 18.5" />
          </svg>
          <input type="search" value={query} placeholder={label} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="gx-groups" role="group" aria-label={label}>
          <button type="button" aria-pressed={group === null} onClick={() => setGroup(null)}>
            {allLabel} <span className="gx-count tabular">{items.length}</span>
          </button>
          {groups.map((g) => (
            <button key={g.key} type="button" aria-pressed={group === g.key} onClick={() => setGroup(group === g.key ? null : g.key)}>
              {g.label} <span className="gx-count tabular">{count(g.key)}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="visually-hidden" role="status">
        {filtered.length}
      </p>
      {filtered.length === 0 ? <p className="gx-empty">{empty.replace("{q}", query)}</p> : null}
      {groups.map((g, gi) => {
        const inGroup = filtered.filter((i) => i.group === g.key);
        if (inGroup.length === 0) return null;
        return (
          <section key={g.key} className="gx-group" aria-labelledby={`g-${g.key}`}>
            <header className="gx-group-head">
              <span className="gx-group-n tabular" aria-hidden="true">
                {String(gi + 1).padStart(2, "0")}
              </span>
              <h2 id={`g-${g.key}`} className="gx-group-title">
                {g.label}
              </h2>
              <span className="gx-group-count tabular">{inGroup.length}</span>
            </header>
            <dl className="gx-grid">
              {inGroup.map((i) => (
                <div key={i.slug} className="gx-card">
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
