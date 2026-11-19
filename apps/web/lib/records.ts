import type { RecordType } from "@paddock/shared";
import type { IconName } from "@/components/icons";

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
