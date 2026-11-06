import type { ToolName } from "@paddock/analysis";

export const TOOL_ORDER: ToolName[] = ["strategy", "pace", "telemetry", "sectors", "replay"];

export function isTool(value: string): value is ToolName {
  return (TOOL_ORDER as string[]).includes(value);
}
