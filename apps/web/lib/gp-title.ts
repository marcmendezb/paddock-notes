import { gpName, type Lang } from "@paddock/shared";

/**
 * "Gran Premio de Brasil" → antes «Gran Premio de», palabra «Brasil»; "Großer Preis von Brasilien" → antes
 * «Großer Preis von», palabra «Brasilien»; "Brazilian Grand Prix" → «Brazilian», después «Grand Prix».
 */
export function splitGpName(lang: Lang, raw: string): { before: string; word: string; after: string } {
  const name = gpName(lang, raw);
  const es = /^(Gran Premio (?:de la |de los |de las |del |de )?)(.+)$/.exec(name);
  if (lang === "es" && es) return { before: es[1]!.trim(), word: es[2]!, after: "" };
  const de = /^(Großer Preis (?:von |der |des |zum )?)(.+)$/.exec(name);
  if (lang === "de" && de) return { before: de[1]!.trim(), word: de[2]!, after: "" };
  const en = /^(.+) (Grand Prix)$/.exec(name);
  if (lang === "en" && en) return { before: "", word: en[1]!, after: en[2]! };
  return { before: "", word: name, after: "" };
}

/** Escala del titular según lo largo que sea: la palabra siempre llena la hoja sin desbordarla. */
export function wordSize(word: string): string {
  if (word.length <= 7) return "sheet-word-xxl";
  if (word.length <= 11) return "sheet-word-xl";
  if (word.length <= 16) return "sheet-word-l";
  return "sheet-word-m";
}

