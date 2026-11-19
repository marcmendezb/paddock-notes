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
 * Subencabezado de la página de carrera: la cabecera se alarga con un segundo nivel, del mismo negro y con
 * la misma anchura que la barra de navegación. A la izquierda, qué carrera es; en el centro, las secciones,
 * y la que se está leyendo lleva el bloque lima, que se desliza de una a otra al bajar (como en el menú
 * principal; se coloca con el CSSOM, que la CSP permite); a la derecha, la carrera anterior y la siguiente.
 * Sin JavaScript, los enlaces funcionan igual (anclas); solo falta marcar la sección actual.
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
  // Tras pulsar una pestaña, el bloque va directo a ella y se queda allí (aunque la sección no llegue a subir
  // del todo, al final de la página) hasta que se vuelve a desplazar a mano.
  const lock = useRef(false);

  // El bloque lima bajo la sección activa; en móvil, además, la pestaña activa se desplaza a la vista.
  useEffect(() => {
    const ul = list.current;
    const block = puck.current;
    if (!ul || !block) return;
    const place = () => {
      // Se mide el <li> (hijo directo de la lista, que es la referencia del bloque), no el enlace.
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
    // La sección activa es la última cuyo principio ya ha pasado por debajo de las dos barras (con la misma
    // medida que usa el desplazamiento a un ancla, para que la pestaña pulsada sea la que queda marcada).
    // Al final de la página, la última: puede que nunca llegue a subir tanto.
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
