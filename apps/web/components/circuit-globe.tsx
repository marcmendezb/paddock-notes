import { geoCircle, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";

const SIZE = 400;
type Topo = Parameters<typeof feature>[0];
const topology = land110 as unknown as Topo & { objects: { land: Parameters<typeof feature>[1] } };
const LAND = feature(topology, topology.objects.land);
const GRATICULE = geoGraticule10();

/**
 * The point where the sun is at its zenith now (a one-degree approximation: declination from the day of the
 * year and longitude from the UTC time, without the equation of time). Enough to shade the night on the globe.
 */
function subsolar(now: Date): [number, number] {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = (now.getTime() - start) / 86_400_000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const lng = ((((12 - hours) * 15 + 180) % 360) + 360) % 360 - 180;
  return [lng, decl];
}

/** Is it night now at that point? (the sun more than 90° from the zenith). */
export function isNight(lat: number, lng: number, now = new Date()): boolean {
  const [slng, slat] = subsolar(now);
  const rad = Math.PI / 180;
  const cos = Math.sin(lat * rad) * Math.sin(slat * rad) + Math.cos(lat * rad) * Math.cos(slat * rad) * Math.cos((lng - slng) * rad);
  return cos < 0;
}

/**
 * Where the circuit is, on a globe turned towards it: land, meridians and parallels every 10°, the part of
 * the world where it is night now and, in the centre, the lime square with its meridian and parallel.
 * Drawn on the server, on every request (D-04), so the night is the one at the moment of the visit.
 */
export function CircuitGlobe({ lat, lng, label, now = new Date() }: { lat: number; lng: number; label: string; now?: Date }) {
  // Slightly tilted: the point sits above the centre and more of the hemisphere shows.
  const projection = geoOrthographic()
    .rotate([-lng, -lat + 12])
    .scale(SIZE / 2 - 8)
    .translate([SIZE / 2, SIZE / 2])
    .clipAngle(90)
    .precision(0.3);
  const path = geoPath(projection);
  const [slng, slat] = subsolar(now);
  const night = geoCircle()
    .center([slng + 180, -slat])
    .radius(90)();
  const parallel = { type: "LineString" as const, coordinates: Array.from({ length: 181 }, (_, i) => [i * 2 - 180, lat] as [number, number]) };
  const meridian = { type: "LineString" as const, coordinates: Array.from({ length: 91 }, (_, i) => [lng, i * 2 - 90] as [number, number]) };
  const pin = projection([lng, lat]);

  return (
    <svg className="cglobe" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <path d={path({ type: "Sphere" }) ?? ""} className="cglobe-sea" />
      <path d={path(GRATICULE) ?? ""} className="cglobe-grid" />
      <path d={path(LAND) ?? ""} className="cglobe-land" />
      <path d={path(night) ?? ""} className="cglobe-night" />
      <path d={path(parallel) ?? ""} className="cglobe-cross" />
      <path d={path(meridian) ?? ""} className="cglobe-cross" />
      <path d={path({ type: "Sphere" }) ?? ""} className="cglobe-rim" />
      {pin ? (
        <g transform={`translate(${pin[0].toFixed(1)} ${pin[1].toFixed(1)})`}>
          <circle r="22" className="cglobe-pulse" />
          <rect x="-7" y="-7" width="14" height="14" className="cglobe-pin" />
        </g>
      ) : null}
    </svg>
  );
}
