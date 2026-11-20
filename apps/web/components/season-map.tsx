import Link from "next/link";
import { geoNaturalEarth1 } from "d3-geo";
import { gpName, gpShortName, type Lang, type RaceSummary } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import {
  EUROPE_BOUNDS,
  EUROPE_LAND_PATH,
  EUROPE_PROJECTION,
  EUROPE_VIEWBOX,
  WORLD_LAND_PATH,
  WORLD_PROJECTION,
  WORLD_VIEWBOX,
} from "@/lib/world-land";

/**
 * Season map (NUC-17): where each race is held, and nothing else. The whole world, with every race (the
 * European ones as small squares), and beside it the enlargement of Europe, marked on the world with the
 * same frame: there the circuits are too close together to number on the world map. Each circuit is
 * a square with its round number (filled = raced, lilac = next, outline = upcoming; shape as well as
 * colour, TRA-22) that links to its page and shows its name on hover. If two overlap, the second moves just
 * enough to be readable. Our own SVG, drawn on the server.
 */

const world = geoNaturalEarth1().scale(WORLD_PROJECTION.scale).translate(WORLD_PROJECTION.translate);
const europe = geoNaturalEarth1().scale(EUROPE_PROJECTION.scale).translate(EUROPE_PROJECTION.translate);

type Project = (p: [number, number]) => [number, number] | null;

const inEurope = (r: RaceSummary) =>
  r.circuit.lng >= EUROPE_BOUNDS.west &&
  r.circuit.lng <= EUROPE_BOUNDS.east &&
  r.circuit.lat >= EUROPE_BOUNDS.south &&
  r.circuit.lat <= EUROPE_BOUNDS.north;

const lngLat = (r: RaceSummary): [number, number] => [r.circuit.lng, r.circuit.lat];

function Pins({ lang, races, project, size, width }: { lang: Lang; races: RaceSummary[]; project: Project; size: number; width: number }) {
  const SIZE = size;
  const t = dict(lang);
  // A circuit with several rounds in the season gets a single square.
  const byCircuit = new Map<string, RaceSummary[]>();
  for (const r of races) byCircuit.set(r.circuit.id, [...(byCircuit.get(r.circuit.id) ?? []), r]);

  const placed: { x: number; y: number }[] = [];
  const pins = [...byCircuit.values()].flatMap((rounds) => {
    const first = rounds[0]!;
    const point = project(lngLat(first));
    if (!point) return [];
    const [x0, y0] = point;
    // If it overlaps another, it moves just enough, in the first free direction.
    let [x, y] = [x0, y0];
    const clash = (px: number, py: number) => placed.some((p) => Math.hypot(p.x - px, p.y - py) < SIZE + 3);
    if (clash(x, y)) {
      for (const angle of [0, 60, -60, 120, -120, 180, 90, -90]) {
        const rad = (angle * Math.PI) / 180;
        const cx = x0 + Math.cos(rad) * (SIZE + 3);
        const cy = y0 + Math.sin(rad) * (SIZE + 3);
        if (!clash(cx, cy)) {
          [x, y] = [cx, cy];
          break;
        }
      }
    }
    placed.push({ x, y });
    const state = rounds.some((r) => r.status === "next") ? "next" : rounds.every((r) => r.status === "completed") ? "done" : "upcoming";
    const label = rounds.map((r) => r.round).join("·");
    const description = rounds
      .map((r) => `${t.map.round(r.round)}: ${gpName(lang, r.name)}, ${first.circuit.name} (${r.status === "completed" ? t.map.done : t.map.upcoming})`)
      .join("; ");
    const w = label.length > 2 ? SIZE + 8 : SIZE;
    return [
      <Link key={first.circuit.id} href={`/${lang}/circuits/${first.circuit.id}`} aria-label={description} className={`map-pin is-${state}`}>
        {state === "next" ? <rect x={x - w / 2 - 4} y={y - SIZE / 2 - 4} width={w + 8} height={SIZE + 8} className="map-halo" /> : null}
        <rect x={x - w / 2} y={y - SIZE / 2} width={w} height={SIZE} className="map-mark" />
        <text x={x} y={y} dy="0.35em" textAnchor="middle" className="map-label">
          {label}
        </text>
        {/* The name, on hover: to the right, or to the left if it does not fit. */}
        <text
          x={x > width * 0.8 ? x - w / 2 - 6 : x + w / 2 + 6}
          y={y}
          dy="0.35em"
          textAnchor={x > width * 0.8 ? "end" : "start"}
          className="map-name"
        >
          {gpShortName(lang, first.name)}
        </text>
      </Link>,
    ];
  });
  return <>{pins}</>;
}

export function SeasonMap({ lang, races, season }: { lang: Lang; races: RaceSummary[]; season: number }) {
  const t = dict(lang);
  const m = t.map;
  const ordered = [...races].sort((a, b) => a.round - b.round);
  const european = ordered.filter(inEurope);
  const [zx0, zy0] = world([EUROPE_BOUNDS.west, EUROPE_BOUNDS.north])!;
  const [zx1, zy1] = world([EUROPE_BOUNDS.east, EUROPE_BOUNDS.south])!;

  return (
    <div className="season-map">
      <figure className="chart map-world">
        <svg viewBox={WORLD_VIEWBOX} className="map-svg" aria-labelledby={`map-world-${season}`}>
          <title id={`map-world-${season}`}>{m.world(season)}</title>
          <path d={WORLD_LAND_PATH} className="map-land" />
          {/* The enlarged area, marked: the same frame and the same name as the enlargement beside it. */}
          {european.length ? (
            <g className="map-zoom" aria-hidden="true">
              <rect x={zx0} y={zy0} width={zx1 - zx0} height={zy1 - zy0} />
              <text x={zx0} y={zy0 - 5}>
                {m.europeShort}
              </text>
            </g>
          ) : null}
          {/* Europe on the world map too, with small squares and no numbers: the numbers go in the enlargement. */}
          <g aria-hidden="true">
            {european.map((r) => {
              const p = world(lngLat(r));
              if (!p) return null;
              const state = r.status === "completed" ? "done" : r.status === "next" ? "next" : "upcoming";
              return <rect key={r.round} x={p[0] - 3} y={p[1] - 3} width={6} height={6} className={`map-mini is-${state}`} />;
            })}
          </g>
          <Pins lang={lang} races={ordered.filter((r) => !inEurope(r))} project={(p) => world(p)} size={20} width={960} />
        </svg>
      </figure>
      {european.length ? (
        <figure className="chart map-europe-figure map-zoomed">
          <svg viewBox={EUROPE_VIEWBOX} className="map-svg map-europe" aria-labelledby={`map-europe-${season}`}>
            <title id={`map-europe-${season}`}>{m.europe}</title>
            <path d={EUROPE_LAND_PATH} className="map-land" />
            <Pins lang={lang} races={european} project={(p) => europe(p)} size={18} width={480} />
          </svg>
          <figcaption className="source">{m.europe}</figcaption>
        </figure>
      ) : null}
      <div className="map-bar">
        <ul className="legend map-legend">
          <li>
            <svg width="16" height="16" aria-hidden="true" className="map-pin is-done">
              <rect x="1" y="1" width="14" height="14" className="map-mark" />
            </svg>
            {m.done}
          </li>
          <li>
            <svg width="16" height="16" aria-hidden="true" className="map-pin is-next">
              <rect x="1" y="1" width="14" height="14" className="map-mark" />
            </svg>
            {m.next}
          </li>
          <li>
            <svg width="16" height="16" aria-hidden="true" className="map-pin is-upcoming">
              <rect x="1.5" y="1.5" width="13" height="13" className="map-mark" />
            </svg>
            {m.upcoming}
          </li>
          <li className="map-source">{m.source}</li>
        </ul>
      </div>
    </div>
  );
}
