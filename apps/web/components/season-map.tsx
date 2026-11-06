import Link from "next/link";
import { geoNaturalEarth1 } from "d3-geo";
import { gpName, type Lang, type RaceSummary } from "@paddock/shared";
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
 * Mapa de la temporada (NUC-17): SVG propio, dibujado en el servidor. Cada punto lleva el número de ronda y
 * enlaza a la ficha del circuito. Los circuitos europeos van en un recuadro ampliado para que no se pisen.
 * Disputada = punto relleno; por disputar = anillo (forma además de color, TRA-22).
 */

const world = geoNaturalEarth1().scale(WORLD_PROJECTION.scale).translate(WORLD_PROJECTION.translate);
const europe = geoNaturalEarth1().scale(EUROPE_PROJECTION.scale).translate(EUROPE_PROJECTION.translate);

const inEurope = (r: RaceSummary) =>
  r.circuit.lng >= EUROPE_BOUNDS.west &&
  r.circuit.lng <= EUROPE_BOUNDS.east &&
  r.circuit.lat >= EUROPE_BOUNDS.south &&
  r.circuit.lat <= EUROPE_BOUNDS.north;

function Pins({ lang, races, project }: { lang: Lang; races: RaceSummary[]; project: (p: [number, number]) => [number, number] | null }) {
  const t = dict(lang);
  // Un circuito con varias rondas en la temporada (p. ej., dos GP en el mismo trazado) lleva un solo punto.
  const byCircuit = new Map<string, RaceSummary[]>();
  for (const r of races) byCircuit.set(r.circuit.id, [...(byCircuit.get(r.circuit.id) ?? []), r]);
  return (
    <>
      {[...byCircuit.values()].map((rounds) => {
        const first = rounds[0]!;
        const point = project([first.circuit.lng, first.circuit.lat]);
        if (!point) return null;
        const done = rounds.every((r) => r.status === "completed");
        const label = rounds.map((r) => r.round).join("·");
        const description = rounds
          .map((r) => `${t.map.round(r.round)}: ${gpName(lang, r.name)}, ${first.circuit.name} (${done ? t.map.done : t.map.upcoming})`)
          .join("; ");
        return (
          <Link key={first.circuit.id} href={`/${lang}/circuits/${first.circuit.id}`} aria-label={description} className="map-pin">
            <circle cx={point[0]} cy={point[1]} r={label.length > 2 ? 12 : 9} className={done ? "map-pin-done" : "map-pin-next"} />
            <text x={point[0]} y={point[1]} dy="0.35em" textAnchor="middle" className={done ? "map-label-done" : "map-label-next"}>
              {label}
            </text>
          </Link>
        );
      })}
    </>
  );
}

export function SeasonMap({ lang, races, season }: { lang: Lang; races: RaceSummary[]; season: number }) {
  const t = dict(lang);
  const european = races.filter(inEurope);
  const rest = races.filter((r) => !inEurope(r));
  const [x0, y0] = world([EUROPE_BOUNDS.west, EUROPE_BOUNDS.north])!;
  const [x1, y1] = world([EUROPE_BOUNDS.east, EUROPE_BOUNDS.south])!;
  return (
    <div className="season-map">
      <figure className="chart">
        <svg viewBox={WORLD_VIEWBOX} className="map-svg" aria-labelledby={`map-world-${season}`}>
          <title id={`map-world-${season}`}>{t.map.world(season)}</title>
          <path d={WORLD_LAND_PATH} className="map-land" />
          {european.length ? <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} className="map-inset-frame" /> : null}
          <Pins lang={lang} races={rest} project={(p) => world(p)} />
        </svg>
      </figure>
      {european.length ? (
        <figure className="chart">
          <svg viewBox={EUROPE_VIEWBOX} className="map-svg map-europe" aria-labelledby={`map-europe-${season}`}>
            <title id={`map-europe-${season}`}>{t.map.europe}</title>
            <path d={EUROPE_LAND_PATH} className="map-land" />
            <Pins lang={lang} races={european} project={(p) => europe(p)} />
          </svg>
          <figcaption className="source">{t.map.europe}</figcaption>
        </figure>
      ) : null}
      <p className="legend">
        <span className="legend-item">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" className="map-pin-done" />
          </svg>
          {t.map.done}
        </span>
        <span className="legend-item">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" className="map-pin-next" />
          </svg>
          {t.map.upcoming}
        </span>
        <span className="legend-item">{t.map.source}</span>
      </p>
    </div>
  );
}
