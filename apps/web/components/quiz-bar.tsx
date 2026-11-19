"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Barra fija al pie del quiz: una casilla por pregunta, que se rellena al contestarla, y el botón de
 * comprobar. Cuenta las respuestas escuchando el formulario; sin JavaScript, la barra sale vacía y el
 * botón funciona igual.
 */
/** `template` lleva «{n}» y «{total}»: una función no puede pasar del servidor al cliente. */
export function QuizBar({ total, template, button }: { total: number; template: string; button: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const count = () => {
      const names = new Set<string>();
      for (const input of form.querySelectorAll<HTMLInputElement>("input[type=radio]:checked")) names.add(input.name);
      setDone(names);
    };
    count();
    form.addEventListener("change", count);
    return () => form.removeEventListener("change", count);
  }, []);

  return (
    <div ref={ref} className="qz-bar">
      <span className="qz-bar-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < done.size ? "is-done" : undefined} />
        ))}
      </span>
      <span className="qz-bar-text" aria-live="polite">
        {template.replace("{n}", String(done.size)).replace("{total}", String(total))}
      </span>
      <button type="submit" className="cmp-go qz-check">
        {button}
      </button>
    </div>
  );
}
