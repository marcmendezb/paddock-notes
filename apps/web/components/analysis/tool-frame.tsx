import type { ReactNode } from "react";
import type { Lang } from "@paddock/shared";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";

/**
 * The tools' shared frame: the question, the automatic note (TEC-08), "How to read this chart" (TEC-09)
 * and the source with a date.
 */
export function ToolFrame({
  lang,
  question,
  note,
  howTo,
  updatedAt,
  children,
}: {
  lang: Lang;
  question: string;
  note: string | null;
  howTo: string;
  updatedAt: string | null;
  children: ReactNode;
}) {
  const t = dict(lang);
  return (
    <div className="stack-l">
      <p className="lede">{question}</p>
      {note ? <p className="auto-note">{note}</p> : null}
      {children}
      <details>
        <summary>{t.analysis.howToRead}</summary>
        <p className="muted">{howTo}</p>
      </details>
      {updatedAt ? <p className="source">{t.source("OpenF1", formatDate(lang, updatedAt))}</p> : null}
    </div>
  );
}
