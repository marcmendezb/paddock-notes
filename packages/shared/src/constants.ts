/** Data sources and licence (D-12). Included in every API response. */
export const SOURCE_JOLPICA = "Jolpica F1";
export const SOURCE_OPENF1 = "OpenF1";
export const DATA_LICENSE = "CC BY-NC-SA 4.0";

/** Hosts ingestion may call (security.md §8). Any other is rejected. */
export const ALLOWED_OUTBOUND_HOSTS = ["api.jolpi.ca", "api.openf1.org"] as const;
export type OutboundHost = (typeof ALLOWED_OUTBOUND_HOSTS)[number];

export const APP_VERSION = "0.1.0";

/** Jolpica requires its own User-Agent (apis.md §2.1). */
export function userAgent(siteUrl: string): string {
  return `PaddockNotes/${APP_VERSION} (+${siteUrl}/about)`;
}

export const LANGS = ["es", "en", "de"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/** The championship's first season. */
export const FIRST_SEASON = 1950;

/** Hours after a race's end beyond which a missing result counts as a delay (D-06). */
export const RESULT_GRACE_HOURS = 6;
