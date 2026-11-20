import type { RecordType } from "@paddock/shared";
import type { IconName } from "@/components/icons";

/**
 * The records pages are hidden (D-34): with the history half loaded, a "record" is not Formula 1's but the
 * loaded seasons'. Setting this to true brings back the pages, the links and the sitemap entries.
 */
export const RECORDS_PUBLIC = false;

export const RECORD_TYPES: RecordType[] = ["wins", "poles", "podiums", "points", "starts", "win-streak", "comebacks", "dnfs"];

export function isRecordType(value: string): value is RecordType {
  return (RECORD_TYPES as string[]).includes(value);
}

/** Each record's pictogram. */
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
