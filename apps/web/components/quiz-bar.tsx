"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A sticky bar at the foot of the quiz: one box per question, filled in when answered, and the check
 * button. It counts the answers by listening to the form; without JavaScript, the bar shows empty and the
 * button works the same.
 */
/** `template` carries "{n}" and "{total}": a function cannot be passed from the server to the client. */
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
