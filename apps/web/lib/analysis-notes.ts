import type { PaceData, ReplayData, SectorsData, StrategyData, TelemetryData } from "@paddock/analysis";
import { delta } from "@paddock/analysis";
import type { Lang } from "@paddock/shared";
import { dict } from "./i18n";
import { localeOf } from "@/lib/format";

/**
 * Notas automáticas bajo cada gráfico (TEC-08). Se generan con reglas a partir de los datos y solo
 * describen lo que se ve: nunca atribuyen causas.
 */

const fmt = (lang: Lang, n: number, digits = 3) =>
  new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

export function strategyNote(lang: Lang, data: StrategyData): string | null {
  const t = dict(lang).analysis;
  const parts = Object.entries(data.facts.stops)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([stops, n]) => t.notes.stops(n, Number(stops)));
  if (parts.length === 0 || data.facts.winnerCompounds.length === 0) return null;
  const winner = data.facts.winnerCompounds.map((c) => t.compounds[c].toLowerCase()).join(" → ");
  return t.notes.strategy(joinList(lang, parts), winner);
}

export function paceNote(lang: Lang, data: PaceData, selected: number[]): string | null {
  const [a, b] = selected.map((n) => data.drivers.find((d) => d.number === n));
  const lastMean = (d: PaceData["drivers"][number] | undefined) =>
    d?.stints.filter((s) => s.mean !== null).at(-1)?.mean ?? null;
  const ma = lastMean(a);
  const mb = lastMean(b);
  if (!a || !b || ma === null || mb === null || ma === mb) return null;
  const [fast, slow, gap] = ma < mb ? [a, b, mb - ma] : [b, a, ma - mb];
  return dict(lang).analysis.notes.pace(fast.name, slow.name, fmt(lang, gap));
}

export function telemetryNote(lang: Lang, a: TelemetryData, b: TelemetryData): string | null {
  const d = delta(a, b);
  const total = d.delta.at(-1);
  if (total === undefined || total === 0) return null;
  // Tramo de 500 m con la mayor variación del delta.
  const window = Math.max(1, Math.round(500 / a.step));
  let best = { from: 0, change: 0 };
  for (let i = 0; i + window < d.delta.length; i++) {
    const change = d.delta[i + window]! - d.delta[i]!;
    if (Math.sign(change) === Math.sign(total) && Math.abs(change) > Math.abs(best.change)) best = { from: i, change };
  }
  const winner = total > 0 ? a.driver.name : b.driver.name;
  const from = Math.round(d.distance[best.from]!);
  const to = Math.round(d.distance[Math.min(d.distance.length - 1, best.from + window)]!);
  return dict(lang).analysis.notes.telemetry(winner, fmt(lang, Math.abs(total)), String(from), String(to));
}

export function sectorsNote(lang: Lang, data: SectorsData): string | null {
  const counts = new Map<string, number>();
  for (const code of data.facts.fastestBySector) if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((x, y) => y[1] - x[1]);
  if (!top) return null;
  const driver = data.drivers.find((d) => d.code === top[0]);
  return dict(lang).analysis.notes.sectors(driver?.name ?? top[0], top[1]);
}

export function replayNote(lang: Lang, data: ReplayData): string | null {
  const led = data.drivers
    .map((d) => ({ d, n: d.positions.filter((p) => p === 1).length }))
    .sort((x, y) => y.n - x.n)[0];
  return led && led.n > 0 ? dict(lang).analysis.notes.replay(led.d.name, led.n) : null;
}

function joinList(lang: Lang, items: string[]): string {
  return new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(items);
}
