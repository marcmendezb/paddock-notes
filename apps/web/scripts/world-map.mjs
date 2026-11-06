/* global URL, console */
/**
 * Genera lib/world-land.ts: el contorno de tierra firme (Natural Earth 1:110m, dominio público, vía
 * world-atlas) proyectado con Natural Earth en un lienzo de 960 px de ancho, sin la Antártida.
 * Se ejecuta a mano (pnpm --filter @paddock/web world-map) y el resultado se versiona: el mapa se
 * dibuja en el servidor sin cargar datos geográficos en cada petición.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topology, topology.objects.land);

const WIDTH = 960;
const projection = geoNaturalEarth1().fitWidth(WIDTH, { type: "Sphere" });
const top = Math.floor(projection([0, 78])[1]);
const bottom = Math.ceil(projection([0, -58])[1]);
const path = geoPath(projection).digits(0)(land);

// Recuadro de Europa: ahí se concentran los circuitos y en el mapa mundial se pisarían.
const EUROPE_BOUNDS = { west: -11, east: 24, south: 35, north: 57 };
const { west, east, south, north } = EUROPE_BOUNDS;
const europeBox = {
  type: "Polygon",
  // En d3-geo el anillo exterior va en sentido horario; al revés sería «todo el globo menos la caja».
  coordinates: [[[west, south], [west, north], [east, north], [east, south], [west, south]]],
};
const EUROPE_WIDTH = 480;
const europe = geoNaturalEarth1().fitWidth(EUROPE_WIDTH, europeBox);
const eTop = Math.min(...[west, (west + east) / 2, east].map((lng) => europe([lng, north])[1]));
const eBottom = Math.max(...[west, (west + east) / 2, east].map((lng) => europe([lng, south])[1]));
const europeView = [0, Math.floor(eTop), EUROPE_WIDTH, Math.ceil(eBottom - eTop)];
const europePath = geoPath(europe.clipExtent([[-20, eTop - 20], [EUROPE_WIDTH + 20, eBottom + 20]])).digits(0)(land);

const out = `// Generado por scripts/world-map.mjs a partir de world-atlas (Natural Earth, dominio público). No editar.
export const WORLD_PROJECTION = { scale: ${projection.scale().toFixed(4)}, translate: [${projection
  .translate()
  .map((v) => v.toFixed(4))
  .join(", ")}] as [number, number] };
export const WORLD_VIEWBOX = "0 ${top} ${WIDTH} ${bottom - top}";
export const WORLD_LAND_PATH = ${JSON.stringify(path)};
export const EUROPE_BOUNDS = ${JSON.stringify(EUROPE_BOUNDS)};
export const EUROPE_PROJECTION = { scale: ${europe.scale().toFixed(4)}, translate: [${europe
  .translate()
  .map((v) => v.toFixed(4))
  .join(", ")}] as [number, number] };
export const EUROPE_VIEWBOX = "${europeView.join(" ")}";
export const EUROPE_LAND_PATH = ${JSON.stringify(europePath)};
`;
writeFileSync(new URL("../lib/world-land.ts", import.meta.url), out);
console.log(`lib/world-land.ts: ${(out.length / 1024).toFixed(1)} kB`);
