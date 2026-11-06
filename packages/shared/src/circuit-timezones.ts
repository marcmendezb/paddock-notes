/**
 * Zona horaria IANA de cada circuito, para mostrar la hora local del circuito (NUC-03).
 * Jolpica no la publica. Si un circuito no está en la lista, la web solo muestra la hora del visitante.
 */
export const CIRCUIT_TIMEZONES: Record<string, string> = {
  albert_park: "Australia/Melbourne",
  americas: "America/Chicago",
  bahrain: "Asia/Bahrain",
  baku: "Asia/Baku",
  catalunya: "Europe/Madrid",
  hungaroring: "Europe/Budapest",
  imola: "Europe/Rome",
  interlagos: "America/Sao_Paulo",
  jeddah: "Asia/Riyadh",
  losail: "Asia/Qatar",
  madring: "Europe/Madrid",
  marina_bay: "Asia/Singapore",
  miami: "America/New_York",
  monaco: "Europe/Monaco",
  monza: "Europe/Rome",
  red_bull_ring: "Europe/Vienna",
  rodriguez: "America/Mexico_City",
  sepang: "Asia/Kuala_Lumpur",
  shanghai: "Asia/Shanghai",
  silverstone: "Europe/London",
  spa: "Europe/Brussels",
  suzuka: "Asia/Tokyo",
  vegas: "America/Los_Angeles",
  villeneuve: "America/Toronto",
  yas_marina: "Asia/Dubai",
  zandvoort: "Europe/Amsterdam",
};

export function circuitTimeZone(circuitId: string): string | null {
  return CIRCUIT_TIMEZONES[circuitId] ?? null;
}
