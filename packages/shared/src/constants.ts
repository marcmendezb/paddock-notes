/** Fuentes de datos y licencia (D-12). Se incluyen en cada respuesta de la API. */
export const SOURCE_JOLPICA = "Jolpica F1";
export const SOURCE_OPENF1 = "OpenF1";
export const DATA_LICENSE = "CC BY-NC-SA 4.0";

/** Hosts a los que la ingesta puede llamar (seguridad.md §8). Cualquier otro se rechaza. */
export const ALLOWED_OUTBOUND_HOSTS = ["api.jolpi.ca", "api.openf1.org"] as const;
export type OutboundHost = (typeof ALLOWED_OUTBOUND_HOSTS)[number];

export const APP_VERSION = "0.1.0";

/** Jolpica exige un User-Agent propio (apis.md §2.1). */
export function userAgent(siteUrl: string): string {
  return `PaddockNotes/${APP_VERSION} (+${siteUrl}/about)`;
}

export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "es";

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

/** Primera temporada del campeonato. */
export const FIRST_SEASON = 1950;

/** Horas tras el final de una carrera a partir de las cuales falta el resultado se considera retraso (D-06). */
export const RESULT_GRACE_HOURS = 6;
