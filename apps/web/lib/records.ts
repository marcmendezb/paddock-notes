import type { RecordType } from "@paddock/shared";

export const RECORD_TYPES: RecordType[] = ["wins", "poles", "podiums", "points", "starts", "win-streak", "comebacks", "dnfs"];

export function isRecordType(value: string): value is RecordType {
  return (RECORD_TYPES as string[]).includes(value);
}
