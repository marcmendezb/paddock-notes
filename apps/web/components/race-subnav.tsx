"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { anchorOffset, documentTop } from "./smooth-scroll";

export interface SubnavItem {
  id: string;
  label: string;
  icon: IconName;
}

/**
 * The race page's sub-navigation: the header grows a second level, the same black and the same width as
 * the navigation bar. On the left, which race it is; in the centre, the sections, with the one being read
 * carrying the lime block, which slides from one to the next as you scroll (as in the main menu; it is
 * positioned through the CSSOM, which the CSP allows); on the right, the previous and next race.
 * Without JavaScript the links work the same (anchors); only marking the current section is missing.
 */
export function RaceSubnav({
  label,
  round,
  name,
  items,
  prev,
  next,
}: {
  label: string;
  round: string;
  name: string;
  items: SubnavItem[];
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const puck = useRef<HTMLSpanElement>(null);
  // After clicking a tab, the block goes straight to it and stays there (even if the section never rises
  // all the way, at the end of the page) until the user scrolls by hand again.
  const lock = useRef(false);

  // The lime block under the active section; on mobile, the active tab also scrolls into view.
  useEffect(() => {
    const ul = list.current;
    const block = puck.current;
    if (!ul || !block) return;
    const place = () => {
      // The <li> is measured (a direct child of the list, which is the block's reference), not the link.
      const link = active ? ul.querySelector<HTMLElement>(`a[href="#${active}"]`)?.parentElement ?? null : null;
      if (!link) {
        block.style.opacity = "0";
        return;
      }
      block.style.opacity = "1";
      block.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth / 100})`;
      const left = link.offsetLeft - ul.scrollLeft;
      if (left < 0 || left + link.offsetWidth > ul.clientWidth) ul.scrollTo({ left: link.offsetLeft - 16, behavior: "smooth" });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;
    // The active section is the last one whose start has already passed under both bars (with the same
    // measurement the anchor scroll uses, so the clicked tab is the one that stays marked).
    // At the end of the page, the last one: it may never rise that far.
    const update = () => {
      if (lock.current) return;
      const line = window.scrollY + anchorOffset() + 24;
      const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let current: string | null = null;
      for (const el of targets) if (documentTop(el) <= line) current = el.id;
      if (bottom && targets.length) current = targets[targets.length - 1]!.id;
      setActive(current);
    };
    const unlock = () => {
      lock.current = false;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    for (const type of ["wheel", "touchstart", "keydown"]) window.addEventListener(type, unlock, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      for (const type of ["wheel", "touchstart", "keydown"]) window.removeEventListener(type, unlock);
    };
  }, [items]);

  return (
    <nav className="rsub" data-surface="ink" aria-label={label}>
      <div className="rsub-row">
        <p className="rsub-id">
          <span className="rsub-round tabular">{round}</span>
          <span className="rsub-name">{name}</span>
        </p>
        <ul ref={list} className="rsub-list">
          <span ref={puck} className="rsub-puck" aria-hidden="true" />
          {items.map((i) => (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                onClick={() => {
                  lock.current = true;
                  setActive(i.id);
                }}
                aria-current={active === i.id ? "location" : undefined}>
                <Icon name={i.icon} />
                <span>{i.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <span className="rsub-arrows">
          {prev ? (
            <Link href={prev.href} className="rsub-arrow" aria-label={prev.label} title={prev.label}>
              ←
            </Link>
          ) : null}
          {next ? (
            <Link href={next.href} className="rsub-arrow" aria-label={next.label} title={next.label}>
              →
            </Link>
          ) : null}
        </span>
      </div>
    </nav>
  );
}
