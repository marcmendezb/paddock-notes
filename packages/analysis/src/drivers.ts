import type { OpenF1Driver, OpenF1Position } from "@paddock/shared/openf1";
import type { DriverInfo } from "./types";

/** Pilotos de la sesión con su posición final (última posición registrada). */
export function driverInfos(drivers: OpenF1Driver[], positions: OpenF1Position[]): DriverInfo[] {
  const final = new Map<number, number>();
  for (const p of [...positions].sort((a, b) => a.date.localeCompare(b.date))) final.set(p.driver_number, p.position);
  const infos = drivers.map((d) => ({
    number: d.driver_number,
    code: d.name_acronym ?? String(d.driver_number),
    name: [d.first_name, d.last_name ? capitalize(d.last_name) : null].filter(Boolean).join(" ") || d.full_name || String(d.driver_number),
    team: d.team_name ?? null,
    finish: final.get(d.driver_number) ?? null,
  }));
  return infos.sort((a, b) => (a.finish ?? 99) - (b.finish ?? 99));
}

function capitalize(name: string): string {
  return name
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (part.length > 1 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join("");
}
