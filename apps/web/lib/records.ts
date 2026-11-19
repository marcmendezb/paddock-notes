import type { RecordType } from "@paddock/shared";
import type { IconName } from "@/components/icons";

/**
 * Las páginas de récords están ocultas (D-34): con el histórico a medio cargar, «récord» no es el de la
 * Fórmula 1 sino el de las temporadas cargadas. Al ponerlo a true vuelven las páginas, los enlaces y el sitemap.
 */
export const RECORDS_PUBLIC = false;

export const RECORD_TYPES: RecordType[] = ["wins", "poles", "podiums", "points", "starts", "win-streak", "comebacks", "dnfs"];

export function isRecordType(value: string): value is RecordType {
  return (RECORD_TYPES as string[]).includes(value);
}

/** Pictograma de cada récord. */
export const RECORD_ICON: Record<RecordType, IconName> = {
  wins: "trophy",
  poles: "flag",
  podiums: "trophy",
  points: "chart",
  starts: "calendar",
  "win-streak": "bolt",
  comebacks: "gauge",
  dnfs: "wrench",
};
