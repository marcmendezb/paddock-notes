"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Lang, SearchResult } from "@paddock/shared";
import { Icon, type IconName } from "./icons";

/**
 * The header's search box (TRA-03): suggestions while typing, grouped into drivers, teams and circuits,
 * from the API's /search through the web app's /api proxy (D-26). An ARIA 1.2 combobox: arrows move,
 * Enter opens, Escape closes. Without JavaScript it is a plain GET form to /search.
 */

export interface HeaderSearchLabels {
  search: string;
  placeholder: string;
  groups: Record<SearchResult["kind"], string>;
  loading: string;
  /** With "{q}" where the query goes. */
  none: string;
  /** With "{q}" where the query goes. */
  all: string;
  clear: string;
  one: string;
  /** With "{n}" where the count goes. */
  many: string;
}

const ORDER: SearchResult["kind"][] = ["driver", "constructor", "circuit"];
const PATH: Record<SearchResult["kind"], string> = { driver: "drivers", constructor: "constructors", circuit: "circuits" };
const ICON: Record<SearchResult["kind"], IconName> = { driver: "user", constructor: "wrench", circuit: "pin" };
const DEBOUNCE_MS = 160;

/** Lower case without accents, keeping the length of an NFC string, so a match can be marked in place. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function highlight(label: string, term: string): ReactNode {
  const at = fold(label).indexOf(fold(term));
  if (at < 0) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark>{label.slice(at, at + term.length)}</mark>
      {label.slice(at + term.length)}
    </>
  );
}

export function HeaderSearch({ lang, labels }: { lang: Lang; labels: HeaderSearchLabels }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, SearchResult[]>());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResults(null);
      setState("idle");
      return;
    }
    const key = fold(term);
    const hit = cache.current.get(key);
    if (hit) {
      setResults(hit);
      setState("done");
      return;
    }
    setState("loading");
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const body = (await res.json()) as { data: SearchResult[] };
        cache.current.set(key, body.data);
        setResults(body.data);
        setState("done");
        setActive(-1);
      } catch {
        if (!ctrl.signal.aborted) setState("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  // A click or tap outside closes the suggestions.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (form.current && !form.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const flat = ORDER.flatMap((kind) => (results ?? []).filter((r) => r.kind === kind));
  const allIndex = flat.length;
  const showPanel = open && term.length >= 2;
  const href = (r: SearchResult) => `/${lang}/${PATH[r.kind]}/${r.id}`;
  const allHref = `/${lang}/search?q=${encodeURIComponent(term)}`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  // Leaving for a result: the box empties and lets go of the focus, ready for the next search.
  const done = () => {
    setOpen(false);
    setQ("");
    setActive(-1);
    input.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = allIndex + 1;
    if (event.key === "ArrowDown" && term.length >= 2) {
      event.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % count);
    } else if (event.key === "ArrowUp" && term.length >= 2) {
      event.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? count - 1 : a - 1));
    } else if (event.key === "Enter" && showPanel && active >= 0) {
      event.preventDefault();
      const target = active === allIndex ? allHref : href(flat[active]!);
      done();
      router.push(target);
    } else if (event.key === "Escape") {
      if (showPanel) setOpen(false);
      else setQ("");
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  let index = -1;
  return (
    <form ref={form} action={`/${lang}/search`} method="get" role="search" className="hsearch" onSubmit={() => setOpen(false)}>
      <div className="hsearch-field">
        <Icon name="search" />
        <input
          ref={input}
          type="search"
          name="q"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label={labels.search}
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          placeholder={labels.placeholder}
          minLength={2}
          maxLength={50}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {q ? (
          <button
            type="button"
            className="hsearch-clear"
            aria-label={labels.clear}
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="hsearch-panel" data-surface="ink">
          {state === "done" && flat.length > 0 ? (
            <div role="listbox" id={listId} aria-label={labels.search} className="hsearch-list">
              {ORDER.map((kind) => {
                const group = flat.filter((r) => r.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind} role="group" aria-label={labels.groups[kind]} className="hsearch-group">
                    <p className="hsearch-group-name" aria-hidden="true">
                      {labels.groups[kind]}
                    </p>
                    {group.map((r) => {
                      index++;
                      const i = index;
                      return (
                        <Link
                          key={`${r.kind}-${r.id}`}
                          id={optionId(i)}
                          href={href(r)}
                          role="option"
                          aria-selected={i === active}
                          tabIndex={-1}
                          className="hsearch-opt"
                          onMouseEnter={() => setActive(i)}
                          onClick={done}
                        >
                          <Icon name={ICON[r.kind]} />
                          <span className="hsearch-label">{highlight(r.label, term)}</span>
                          {r.detail ? <span className="hsearch-detail">{r.detail}</span> : null}
                          <span className="hsearch-arrow" aria-hidden="true">
                            →
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
              <Link
                id={optionId(allIndex)}
                href={allHref}
                role="option"
                aria-selected={active === allIndex}
                tabIndex={-1}
                className="hsearch-all"
                onMouseEnter={() => setActive(allIndex)}
                onClick={done}
              >
                {labels.all.replace("{q}", term)}
                <span className="hsearch-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          ) : state === "error" ? (
            // The suggestions failed: the full results page still works.
            <Link id={listId} href={allHref} className="hsearch-all" onClick={done}>
              {labels.all.replace("{q}", term)}
              <span className="hsearch-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <p className="hsearch-note" id={listId}>
              {state === "done" ? labels.none.replace("{q}", term) : labels.loading}
            </p>
          )}
        </div>
      ) : null}

      <p className="visually-hidden" aria-live="polite">
        {showPanel && state === "done" ? (flat.length === 1 ? labels.one : labels.many.replace("{n}", String(flat.length))) : ""}
      </p>
    </form>
  );
}
