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
 * Mapa de la temporada (NUC-17): dónde se corre cada carrera, y nada más. El mundo entero, con todas las
 * carreras (las europeas, como cuadrados pequeños), y al lado la ampliación de Europa, marcada en el mundo
 * con el mismo marco: allí los circuitos están demasiado juntos para numerarlos en el mapa del mundo. Cada circuito es
 * un cuadrado con su número de ronda (relleno = disputada, lila = la siguiente, contorno = por disputar;
 * forma además de color, TRA-22) que enlaza a su ficha y muestra su nombre al señalarlo. Si dos se pisan,
 * el segundo se aparta lo justo para leerse. SVG propio, dibujado en el servidor.
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
  // Un circuito con varias rondas en la temporada lleva un solo cuadrado.
  const byCircuit = new Map<string, RaceSummary[]>();
  for (const r of races) byCircuit.set(r.circuit.id, [...(byCircuit.get(r.circuit.id) ?? []), r]);

  const placed: { x: number; y: number }[] = [];
  const pins = [...byCircuit.values()].flatMap((rounds) => {
    const first = rounds[0]!;
    const point = project(lngLat(first));
    if (!point) return [];
    const [x0, y0] = point;
    // Si pisa a otro, se aparta lo justo, en la primera dirección libre.
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
        {/* El nombre, al señalarlo: a la derecha, o a la izquierda si no cabe. */}
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
          {/* La zona ampliada, marcada: el mismo marco y el mismo nombre que la ampliación de al lado. */}
          {european.length ? (
            <g className="map-zoom" aria-hidden="true">
              <rect x={zx0} y={zy0} width={zx1 - zx0} height={zy1 - zy0} />
              <text x={zx0} y={zy0 - 5}>
                {m.europeShort}
              </text>
            </g>
          ) : null}
          {/* Europa también en el mapa del mundo, con cuadrados pequeños sin número: los números, en la ampliación. */}
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
