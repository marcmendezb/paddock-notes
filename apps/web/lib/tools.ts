import type { ToolName } from "@paddock/analysis";
import type { IconName } from "@/components/icons";

export const TOOL_ORDER: ToolName[] = ["strategy", "pace", "telemetry", "sectors", "replay"];

export function isTool(value: string): value is ToolName {
  return (TOOL_ORDER as string[]).includes(value);
}

/** Pictograma de cada herramienta, el mismo en el menú, la portada de análisis y cada carrera. */
export const TOOL_ICON: Record<ToolName, IconName> = { strategy: "layers", pace: "gauge", telemetry: "chart", sectors: "stopwatch", replay: "flag" };
