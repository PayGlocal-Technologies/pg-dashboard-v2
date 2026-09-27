"use client";

import {
  geoBounds,
  geoContains,
  geoDistance,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import worldTopology from "world-atlas/countries-110m.json";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";

/** viewBox size; the SVG scales to its container. */
const SIZE = 600;
const RADIUS = SIZE / 2 - 6;
/** Globe centred over South Asia, tilted slightly north so Europe sits
 *  top-left and Australia bottom-right. */
const CENTER: [number, number] = [72, 16];
/** Dot spacing in degrees of latitude (longitude spacing widens with 1/cos). */
const STEP = 2.2;

const LAND_DOT = "#c3c9e4";
const INDIA_DOT = "#2f5bd9";
const INDIA_ID = "356";

type LonLat = [number, number];

const FLAGS: { iso2: string; name: string; at: LonLat }[] = [
  { iso2: "GB", name: "United Kingdom", at: [-1.5, 53] },
  { iso2: "EU", name: "European Union", at: [4, 47] },
  { iso2: "AE", name: "United Arab Emirates", at: [54, 24] },
  { iso2: "CN", name: "China", at: [104, 35] },
  { iso2: "JP", name: "Japan", at: [139, 37] },
  { iso2: "SG", name: "Singapore", at: [103.8, 1.4] },
  { iso2: "AU", name: "Australia", at: [145, -30] },
  { iso2: "IN", name: "India", at: [79, 22] },
];

const ROUTE_FROM: LonLat = [-1.5, 53];
const ROUTE_TO: LonLat = [73, 19];

interface Dot {
  x: number;
  y: number;
  r: number;
  opacity: number;
  india: boolean;
}

type Bounds = [[number, number], [number, number]];

function inBounds([[w, s], [e, n]]: Bounds, [lon, lat]: LonLat) {
  if (lat < s || lat > n) return false;
  // geoBounds reports antimeridian-crossing shapes with west > east.
  return w <= e ? lon >= w && lon <= e : lon >= w || lon <= e;
}

/** Everything static. Computed once per page load (see `cached`) — the land
 *  test runs ~5k times, so each landmass is bbox-checked before the (costly)
 *  point-in-polygon test, which cuts the work roughly 3×. */
function buildGlobe() {
  const topo = worldTopology as unknown as Topology;
  const land = feature(topo, topo.objects.land as GeometryCollection) as FeatureCollection;
  const landmasses = land.features.flatMap((f) => {
    const g = f.geometry as Polygon | MultiPolygon;
    const rings = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    return rings.map((coordinates) => {
      const poly: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates },
      };
      return { poly, bounds: geoBounds(poly) as Bounds };
    });
  });
  const isLand = (p: LonLat) =>
    landmasses.some((m) => inBounds(m.bounds, p) && geoContains(m.poly, p));
  const countries = feature(
    topo,
    topo.objects.countries as GeometryCollection
  ) as FeatureCollection;
  const india = countries.features.find((f) => String(f.id) === INDIA_ID) as
    Feature<Geometry> | undefined;

  const projection = geoOrthographic()
    .scale(RADIUS)
    .translate([SIZE / 2, SIZE / 2])
    .rotate([-CENTER[0], -CENTER[1]])
    .clipAngle(90);

  const dots: Dot[] = [];
  for (let lat = -58; lat <= 80; lat += STEP) {
    const lonStep = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    for (let lon = -180; lon < 180; lon += lonStep) {
      const p: LonLat = [lon, lat];
      const dist = geoDistance(p, CENTER);
      if (dist > Math.PI / 2 - 0.03) continue;
      if (!isLand(p)) continue;
      const xy = projection(p);
      if (!xy) continue;
      // Facing the viewer = full size/opacity; toward the limb, smaller and fainter.
      const facing = Math.cos(dist);
      dots.push({
        x: xy[0],
        y: xy[1],
        r: 2.1 * (0.55 + 0.45 * facing),
        opacity: 0.35 + 0.65 * facing,
        india: !!india && geoContains(india, p),
      });
    }
  }

  const visible = (p: LonLat) => geoDistance(p, CENTER) < (85 * Math.PI) / 180;
  const toPct = (p: LonLat) => {
    const xy = projection(p);
    return xy ? { left: `${(xy[0] / SIZE) * 100}%`, top: `${(xy[1] / SIZE) * 100}%` } : null;
  };

  const flags = FLAGS.filter((f) => visible(f.at)).map((f) => ({ ...f, pos: toPct(f.at) }));
  const routePath =
    geoPath(projection)({ type: "LineString", coordinates: [ROUTE_FROM, ROUTE_TO] }) ?? "";
  const routeEnd = projection(ROUTE_TO);
  const routeLabel = toPct(geoInterpolate(ROUTE_FROM, ROUTE_TO)(0.55) as LonLat);

  return { dots, flags, routePath, routeEnd, routeLabel };
}

let cached: ReturnType<typeof buildGlobe> | null = null;

/** Decorative dotted globe for the landing hero: land sampled as dots from
 *  world-atlas, India highlighted, flags pinned on key corridors, and a dashed
 *  UK → India payment route. */
// Client-only (loaded via next/dynamic with ssr:false), so this module-level
// cache never runs on the server and is safe to read during render.
export function LandingGlobe({ className }: { className?: string }) {
  const { dots, flags, routePath, routeEnd, routeLabel } = (cached ??= buildGlobe());

  return (
    <div className={className} aria-hidden>
      <div className="relative aspect-square w-full">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="landing-globe-halo" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#e9ecf8" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS + 4} fill="url(#landing-globe-halo)" />
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.india ? d.r * 1.15 : d.r}
              fill={d.india ? INDIA_DOT : LAND_DOT}
              opacity={d.india ? 1 : d.opacity}
            />
          ))}
          {routePath && (
            <path
              d={routePath}
              fill="none"
              stroke="#d6336c"
              strokeWidth={2}
              strokeDasharray="3 5"
              strokeLinecap="round"
              opacity={0.75}
            />
          )}
          {routeEnd && <circle cx={routeEnd[0]} cy={routeEnd[1]} r={4} fill="#d6336c" />}
        </svg>

        {routeLabel && (
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#c2255c] shadow-sm"
            style={routeLabel}
          >
            £1,240 GBP
          </span>
        )}

        {flags.map(
          (f) =>
            f.pos && (
              <span
                key={f.iso2}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-0.5 shadow-md"
                style={f.pos}
              >
                <CountryFlagAvatar iso2={f.iso2} countryName={f.name} className="h-6 w-6" />
              </span>
            )
        )}
      </div>
    </div>
  );
}
