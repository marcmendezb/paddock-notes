import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";

/** Resultado de un formulario tras la redirección (?msg=accion:resultado), anunciado a lectores de pantalla. */
export function FormMessage({ lang, msg, okText }: { lang: Lang; msg: string | undefined; okText?: string }) {
  if (!msg) return null;
  const t = dict(lang).account;
  const [action, result = ""] = msg.split(":");
  const ok = result === "ok";
  const errors = t.errors as Record<string, string>;
  const text = ok
    ? (okText ?? t.okBy[action ?? ""] ?? t.saved)
    : (errors[`${result}:${msg.split(":")[2] ?? ""}`] ??
      (result === "Demasiadas" ? t.errors.rate : (errors[result] ?? t.failBy[action ?? ""] ?? t.errors.generic)));
  return (
    <p className={ok ? "auto-note" : "notice"} role={ok ? "status" : "alert"}>
      {text}
    </p>
  );
}
