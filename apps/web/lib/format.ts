import type { Lang } from "@paddock/shared";

/** Localised formats with Intl (TRA-13, content.md §2). */

/** Each language's locale for Intl (dates, numbers). */
export const localeOf = (lang: Lang): string => ({ es: "es-ES", en: "en-GB", de: "de-DE" })[lang];
const locale = localeOf;

/** "16 mar 2025" (ES) / "Mar 16, 2025" (EN). */
export function formatDate(lang: Lang, isoDate: string, timeZone = "UTC"): string {
  const date = isoDate.length === 10 ? new Date(`${isoDate}T12:00:00Z`) : new Date(isoDate);
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : localeOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  })
    .format(date)
    .replace(".", "");
}

export function formatDateTime(lang: Lang, iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatTime(lang: Lang, iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale(lang), { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

/** Points with decimals when there are any (2,5 in ES; 2.5 in EN). */
export function formatPoints(lang: Lang, points: number): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 1 }).format(points);
}

/** A signed difference: "+3" / "−2" (typographic minus sign). */
export function formatSigned(lang: Lang, value: number): string {
  if (value === 0) return "0";
  const abs = new Intl.NumberFormat(locale(lang)).format(Math.abs(value));
  return value > 0 ? `+${abs}` : `−${abs}`;
}

export function fullName(d: { givenName: string; familyName: string }): string {
  return `${d.givenName} ${d.familyName}`;
}
