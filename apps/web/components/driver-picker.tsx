"use client";

import { useEffect, useRef, useState } from "react";

export interface PickerDriver {
  id: string;
  code: string;
  given: string;
  family: string;
  team: string;
  position: number | null;
}

/**
 * The head-to-head driver picker (D-35): instead of a <select>, a dropdown with the season's grid as cards
 * (position, large code, name and team). They are radio inputs inside the form, so it works without
 * JavaScript; with JavaScript, the header shows the chosen driver and the panel closes on choosing, on an
 * outside click or with Escape. `side` paints driver A in lime and driver B in lilac.
 */
export function DriverPicker({
  name,
  label,
  drivers,
  value,
  side,
  change,
}: {
  name: "a" | "b";
  label: string;
  drivers: PickerDriver[];
  value: string | null;
  side: "a" | "b";
  change: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [selected, setSelected] = useState(value);
  const current = drivers.find((d) => d.id === selected) ?? null;

  useEffect(() => {
    const close = (event: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        el.open = false;
        el.querySelector("summary")?.focus();
        return;
      }
      if (!el.contains(event.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className={`dp is-${side}`}>
      <summary>
        <span className="dp-label">{label}</span>
        {current ? (
          <span className="dp-current">
            <span className="dp-code">{current.code}</span>
            <span className="dp-who">
              <span className="dp-name">
                {current.given} {current.family}
              </span>
              <span className="dp-team">
                {current.position ? `P${current.position} · ` : ""}
                {current.team}
              </span>
            </span>
          </span>
        ) : (
          <span className="dp-current dp-empty">—</span>
        )}
        <span className="dp-change">{change}</span>
      </summary>
      <fieldset className="dp-panel">
        <legend className="visually-hidden">{label}</legend>
        {drivers.map((d) => (
          <label key={d.id} className="dp-option">
            <input
              type="radio"
              name={name}
              value={d.id}
              defaultChecked={d.id === value}
              required
              onChange={() => {
                setSelected(d.id);
                if (ref.current) ref.current.open = false;
              }}
            />
            <span className="dp-option-pos tabular">{d.position ? `P${d.position}` : ""}</span>
            <span className="dp-option-code">{d.code}</span>
            <span className="dp-option-name">{d.family}</span>
            <span className="dp-option-team">{d.team}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
