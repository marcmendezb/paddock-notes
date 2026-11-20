/**
 * Charts with a phone geometry (D-37). An SVG scaled into a 360 px screen shrinks its 13 px labels to 6 px,
 * so each chart is drawn twice: a wide geometry (760 units) and a narrow one (380 units), with fewer ticks
 * and tighter margins. A container query in globals.css shows the one that fits the space the chart
 * actually has (`.chart-duo`), with no JavaScript; the other is display: none and out of the
 * accessibility tree.
 */
export type ChartSize = "wide" | "narrow";

export const CHART_SIZES: readonly ChartSize[] = ["wide", "narrow"];

/** Width in SVG units of each geometry. */
export const CHART_W: Record<ChartSize, number> = { wide: 760, narrow: 380 };

/** Class of the SVG drawn for a geometry. */
export function sizeClass(size: ChartSize): string {
  return `chart-svg chart-${size}`;
}
