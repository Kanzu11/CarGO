import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { localMetersToLngLat } from "@/components/map/vehicleModels";
import { CITIES } from "@/lib/cities";
import { bearingDeg, haversineMeters, lerpLngLat } from "@/lib/geo";
import { localizePlaceName } from "@/lib/i18n";
import { createPrng, hashSeed, pickRandom, randomBetween } from "@/lib/random";
import type { CityId, LngLat, Locale } from "@/types/fleet";

export interface City3dSceneGeoJson {
  buildings: FeatureCollection<Polygon>;
  trees: FeatureCollection<Polygon>;
  landmarks: FeatureCollection<Point>;
}

interface ParkZoneSpec {
  center: LngLat;
  radiusM: number;
  count: number;
}

interface TowerHubSpec {
  center: LngLat;
  bearing: number;
  widthM: number;
  depthM: number;
  podiumH: number;
  towerH: number;
  podiumColor: string;
  towerColor: string;
}

const ARCH_COLORS = ["#E2E8F0", "#CBD5E1", "#D6D3D1", "#94A3B8"] as const;
const TRUNK_COLOR = "#5C4033";
const LOWER_CROWN_COLORS = ["#14532D", "#166534"] as const;
const MID_CROWN_COLORS = ["#15803D", "#16A34A"] as const;
const TOP_CROWN_COLOR = "#22C55E";

// Curated 28 Addis Ababa architectural complexes across major corridors
const ADDIS_TOWER_HUBS: ReadonlyArray<TowerHubSpec> = [
  // Meskel Square / CBE Financial District / Finfine
  { center: [38.7598, 9.0121], bearing: -14, widthM: 34, depthM: 28, podiumH: 14, towerH: 64, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7634, 9.0094], bearing: 18, widthM: 30, depthM: 24, podiumH: 12, towerH: 48, podiumColor: "#E7E5E4", towerColor: "#CBD5E1" },
  { center: [38.7628, 9.0126], bearing: 8, widthM: 26, depthM: 22, podiumH: 10, towerH: 38, podiumColor: "#D6D3D1", towerColor: "#E2E8F0" },
  { center: [38.7582, 9.0114], bearing: -22, widthM: 28, depthM: 24, podiumH: 12, towerH: 42, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  { center: [38.7646, 9.0108], bearing: -8, widthM: 24, depthM: 20, podiumH: 11, towerH: 40, podiumColor: "#E2E8F0", towerColor: "#94A3B8" },
  // Kazanchis ECA & Radisson Commercial Cluster
  { center: [38.7686, 9.0169], bearing: 12, widthM: 36, depthM: 26, podiumH: 12, towerH: 44, podiumColor: "#E2E8F0", towerColor: "#CBD5E1" },
  { center: [38.7712, 9.0149], bearing: -10, widthM: 28, depthM: 22, podiumH: 10, towerH: 36, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7676, 9.0156], bearing: 4, widthM: 24, depthM: 20, podiumH: 10, towerH: 32, podiumColor: "#E7E5E4", towerColor: "#CBD5E1" },
  { center: [38.7726, 9.0164], bearing: 15, widthM: 26, depthM: 22, podiumH: 11, towerH: 38, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  // Olympia / Dembel / Africa Avenue High-Rises
  { center: [38.7672, 9.0038], bearing: -25, widthM: 32, depthM: 24, podiumH: 12, towerH: 46, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  { center: [38.7704, 9.0018], bearing: 14, widthM: 28, depthM: 22, podiumH: 10, towerH: 34, podiumColor: "#E2E8F0", towerColor: "#D6D3D1" },
  { center: [38.7746, 9.0014], bearing: -12, widthM: 28, depthM: 22, podiumH: 11, towerH: 36, podiumColor: "#D6D3D1", towerColor: "#CBD5E1" },
  { center: [38.7775, 9.0011], bearing: -18, widthM: 30, depthM: 24, podiumH: 12, towerH: 40, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7815, 8.9994], bearing: 10, widthM: 26, depthM: 20, podiumH: 10, towerH: 35, podiumColor: "#E7E5E4", towerColor: "#94A3B8" },
  // Bole Medhanialem Commercial & Hospitality Strip
  { center: [38.7881, 8.9994], bearing: 20, widthM: 32, depthM: 24, podiumH: 12, towerH: 42, podiumColor: "#E7E5E4", towerColor: "#CBD5E1" },
  { center: [38.7908, 8.9968], bearing: -15, widthM: 28, depthM: 22, podiumH: 10, towerH: 34, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  { center: [38.7875, 8.9964], bearing: 6, widthM: 26, depthM: 20, podiumH: 9, towerH: 28, podiumColor: "#E2E8F0", towerColor: "#D6D3D1" },
  { center: [38.7924, 8.9988], bearing: -14, widthM: 28, depthM: 22, podiumH: 10, towerH: 32, podiumColor: "#D6D3D1", towerColor: "#CBD5E1" },
  // Mexico Square & Sarbet Institutional Towers
  { center: [38.7446, 9.0114], bearing: -12, widthM: 34, depthM: 26, podiumH: 14, towerH: 52, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7474, 9.0091], bearing: 16, widthM: 28, depthM: 22, podiumH: 10, towerH: 36, podiumColor: "#E2E8F0", towerColor: "#CBD5E1" },
  { center: [38.7428, 9.0092], bearing: 8, widthM: 26, depthM: 22, podiumH: 11, towerH: 40, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  { center: [38.7398, 8.9956], bearing: -8, widthM: 30, depthM: 24, podiumH: 10, towerH: 32, podiumColor: "#E7E5E4", towerColor: "#94A3B8" },
  // Piassa, Arat Kilo, Urael, Hayahulet, Megenagna & Bole Airport Terminal
  { center: [38.7512, 9.0329], bearing: 14, widthM: 30, depthM: 24, podiumH: 11, towerH: 32, podiumColor: "#D6D3D1", towerColor: "#E2E8F0" },
  { center: [38.7622, 9.0321], bearing: -6, widthM: 32, depthM: 24, podiumH: 12, towerH: 34, podiumColor: "#E7E5E4", towerColor: "#CBD5E1" },
  { center: [38.7774, 9.0124], bearing: -10, widthM: 28, depthM: 22, podiumH: 10, towerH: 34, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7866, 9.0135], bearing: 22, widthM: 28, depthM: 22, podiumH: 10, towerH: 36, podiumColor: "#CBD5E1", towerColor: "#94A3B8" },
  { center: [38.8002, 9.0194], bearing: -16, widthM: 34, depthM: 26, podiumH: 12, towerH: 40, podiumColor: "#D6D3D1", towerColor: "#94A3B8" },
  { center: [38.7964, 8.9832], bearing: 8, widthM: 58, depthM: 32, podiumH: 14, towerH: 24, podiumColor: "#E2E8F0", towerColor: "#CBD5E1" },
];

// Curated Addis Ababa parks & green compounds
const ADDIS_PARK_ZONES: ReadonlyArray<ParkZoneSpec> = [
  { center: [38.7615, 9.0215], radiusM: 92, count: 16 }, // Friendship / Sheger Park
  { center: [38.7582, 9.0092], radiusM: 76, count: 14 }, // Ghion / Meskel Park
  { center: [38.7682, 9.0145], radiusM: 64, count: 10 }, // Kazanchis ECA green compound
  { center: [38.7745, 8.9985], radiusM: 68, count: 10 }, // Olympia / Peacock corridor
  { center: [38.7882, 8.9992], radiusM: 56, count: 8 },  // Bole Medhanialem green plaza
  { center: [38.7565, 9.0285], radiusM: 70, count: 12 }, // Arat Kilo / Piassa green grounds
  { center: [38.7405, 8.9985], radiusM: 60, count: 8 },  // Sarbet green compound
];

const sceneCache = new Map<
  CityId,
  { buildings: FeatureCollection<Polygon>; trees: FeatureCollection<Polygon> }
>();

function buildRectPolygon(
  center: LngLat,
  widthM: number,
  depthM: number,
  bearingDeg: number,
): LngLat[] {
  const hw = widthM / 2;
  const hd = depthM / 2;
  const corners: [number, number][] = [
    [hd, hw],
    [hd, -hw],
    [-hd, -hw],
    [-hd, hw],
  ];
  const ring = corners.map(([f, r]) => localMetersToLngLat(center, f, r, bearingDeg));
  ring.push(ring[0]!);
  return ring;
}

function buildCirclePolygon(
  center: LngLat,
  radiusM: number,
  sides: number,
  rotationOffsetDeg = 0,
): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i < sides; i++) {
    ring.push(localMetersToLngLat(center, radiusM, 0, rotationOffsetDeg + (i / sides) * 360));
  }
  ring.push(ring[0]!);
  return ring;
}

/**
 * 5-part 3D architectural complex: street podium, flanking wing, lower shaft,
 * setback upper tower, and rooftop penthouse/crown.
 */
function appendArchitecturalComplex(
  features: Feature<Polygon>[],
  spec: TowerHubSpec,
): void {
  const wingCenter = localMetersToLngLat(
    spec.center,
    -spec.depthM * 0.25,
    spec.widthM * 0.42,
    spec.bearing,
  );
  const midH = Math.round(spec.podiumH + (spec.towerH - spec.podiumH) * 0.56);

  features.push(
    {
      type: "Feature",
      properties: { base: 0, height: spec.podiumH, color: spec.podiumColor },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectPolygon(spec.center, spec.widthM, spec.depthM, spec.bearing)],
      },
    },
    {
      type: "Feature",
      properties: { base: 0, height: Math.round(spec.podiumH * 0.8), color: "#E7E5E4" },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectPolygon(wingCenter, spec.widthM * 0.45, spec.depthM * 0.55, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: spec.podiumH, height: midH, color: spec.towerColor },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectPolygon(spec.center, spec.widthM * 0.72, spec.depthM * 0.72, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: midH, height: spec.towerH, color: spec.podiumColor },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectPolygon(spec.center, spec.widthM * 0.52, spec.depthM * 0.52, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: spec.towerH, height: spec.towerH + 5, color: "#475569" },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectPolygon(spec.center, spec.widthM * 0.26, spec.depthM * 0.26, spec.bearing),
        ],
      },
    },
  );
}

/** 3D monument beacon at each landmark (plaza + shaft + emerald lantern cap). */
function appendLandmarkBeacon3d(features: Feature<Polygon>[], coords: LngLat): void {
  features.push(
    {
      type: "Feature",
      properties: { base: 0, height: 1.4, color: "#E2E8F0" },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(coords, 6.2, 8, 22.5)] },
    },
    {
      type: "Feature",
      properties: { base: 1.4, height: 12, color: "#1E293B" },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(coords, 1.9, 8, 0)] },
    },
    {
      type: "Feature",
      properties: { base: 12, height: 15.5, color: "#10B981" },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(coords, 3.6, 8, 22.5)] },
    },
  );
}

function appendSculpted3dTree(
  features: Feature<Polygon>[],
  center: LngLat,
  scale: number,
  rng: () => number,
): void {
  const rot = rng() * 36;
  const trunkR = 0.68 * scale;
  const trunkH = Number((2.0 + rng() * 0.5).toFixed(2));
  const lowerR = (3.4 + rng() * 1.1) * scale;
  const lowerH = Number((trunkH + 3.4 + rng() * 1.2).toFixed(2));
  const midR = lowerR * 0.72;
  const midBase = Number((lowerH - 1.0).toFixed(2));
  const midH = Number((lowerH + 2.4 + rng() * 1.1).toFixed(2));
  const topR = lowerR * 0.42;
  const topBase = Number((midH - 0.9).toFixed(2));
  const topH = Number((midH + 1.8 + rng() * 0.9).toFixed(2));

  features.push(
    {
      type: "Feature",
      properties: { kind: "trunk", base: 0, height: trunkH, color: TRUNK_COLOR },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(center, trunkR, 6, rot)] },
    },
    {
      type: "Feature",
      properties: {
        kind: "crown",
        base: trunkH,
        height: lowerH,
        color: pickRandom(LOWER_CROWN_COLORS, rng),
      },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(center, lowerR, 8, rot)] },
    },
    {
      type: "Feature",
      properties: {
        kind: "crown",
        base: midBase,
        height: midH,
        color: pickRandom(MID_CROWN_COLORS, rng),
      },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(center, midR, 8, rot + 18)] },
    },
    {
      type: "Feature",
      properties: {
        kind: "crown",
        base: topBase,
        height: topH,
        color: TOP_CROWN_COLOR,
      },
      geometry: { type: "Polygon", coordinates: [buildCirclePolygon(center, topR, 8, rot + 32)] },
    },
  );
}

function buildStatic3dScene(cityId: CityId): {
  buildings: FeatureCollection<Polygon>;
  trees: FeatureCollection<Polygon>;
} {
  const cached = sceneCache.get(cityId);
  if (cached) return cached;

  const city = CITIES[cityId];
  const rng = createPrng(hashSeed(`scene3d:${cityId}`));

  const buildings: Feature<Polygon>[] = [];
  const trees: Feature<Polygon>[] = [];

  for (const landmark of city.landmarks) {
    appendLandmarkBeacon3d(buildings, landmark.coords);
  }

  if (cityId === "addis") {
    for (const tower of ADDIS_TOWER_HUBS) {
      appendArchitecturalComplex(buildings, tower);
    }
    for (const park of ADDIS_PARK_ZONES) {
      for (let i = 0; i < park.count; i++) {
        const dist = randomBetween(10, park.radiusM, rng);
        const angle = (i / park.count) * 360 + randomBetween(-12, 12, rng);
        const pos = localMetersToLngLat(park.center, dist, 0, angle);
        appendSculpted3dTree(trees, pos, randomBetween(0.95, 1.35, rng), rng);
      }
    }
  } else {
    for (let idx = 0; idx < city.landmarks.length; idx++) {
      const landmark = city.landmarks[idx]!;
      const blockBearing = randomBetween(-20, 20, rng);
      const bCenter1 = localMetersToLngLat(landmark.coords, 48, 42, (idx * 70) % 360);
      const bCenter2 = localMetersToLngLat(landmark.coords, 62, -46, (idx * 70 + 140) % 360);

      appendArchitecturalComplex(buildings, {
        center: bCenter1,
        bearing: blockBearing,
        widthM: randomBetween(24, 34, rng),
        depthM: randomBetween(18, 26, rng),
        podiumH: Math.round(randomBetween(8, 12, rng)),
        towerH: Math.round(randomBetween(20, 36, rng)),
        podiumColor: ARCH_COLORS[idx % ARCH_COLORS.length]!,
        towerColor: ARCH_COLORS[(idx + 1) % ARCH_COLORS.length]!,
      });

      appendArchitecturalComplex(buildings, {
        center: bCenter2,
        bearing: blockBearing + 15,
        widthM: randomBetween(20, 28, rng),
        depthM: randomBetween(16, 22, rng),
        podiumH: Math.round(randomBetween(7, 10, rng)),
        towerH: Math.round(randomBetween(16, 26, rng)),
        podiumColor: ARCH_COLORS[(idx + 2) % ARCH_COLORS.length]!,
        towerColor: ARCH_COLORS[(idx + 3) % ARCH_COLORS.length]!,
      });

      const parkOrigin = localMetersToLngLat(landmark.coords, -45, 36, (idx * 55) % 360);
      for (let t = 0; t < 4; t++) {
        const treePos = localMetersToLngLat(parkOrigin, randomBetween(8, 28, rng), 0, t * 90 + rng() * 25);
        appendSculpted3dTree(trees, treePos, randomBetween(0.9, 1.25, rng), rng);
      }
    }
  }

  // Avenue trees neatly offset 26m along key boulevards clear of road & intersection lanes
  let avenueTrees = 0;
  for (const [fromId, toId] of city.graph.edges) {
    if (avenueTrees >= 36) break;
    const from = city.graph.nodes[fromId];
    const to = city.graph.nodes[toId];
    if (!from || !to) continue;
    const lenM = haversineMeters(from, to);
    if (lenM < 450) continue;

    const bearing = bearingDeg(from, to);
    const mid = lerpLngLat(from, to, 0.5);
    const offsetM = (avenueTrees % 2 === 0 ? 1 : -1) * 26;
    const treePos = localMetersToLngLat(mid, 0, offsetM, bearing);
    appendSculpted3dTree(trees, treePos, randomBetween(0.9, 1.15, rng), rng);
    avenueTrees++;
  }

  const result = {
    buildings: { type: "FeatureCollection" as const, features: buildings },
    trees: { type: "FeatureCollection" as const, features: trees },
  };
  sceneCache.set(cityId, result);
  return result;
}

/**
 * Builds localized landmark anchor points for the given Ethiopian city.
 */
export function buildCityLandmarksGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): FeatureCollection<Point> {
  const city = CITIES[cityId];

  const features: Feature<Point>[] = city.landmarks.map((landmark) => ({
    type: "Feature",
    properties: {
      id: landmark.id,
      name: landmark.name,
      label: localizePlaceName(landmark, locale),
      tag: landmark.tag,
    },
    geometry: {
      type: "Point",
      coordinates: landmark.coords,
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Builds cohesive 5-part 3D buildings, 3D landmark beacons, sculpted multi-tier
 * park/avenue trees, and localized landmark anchors layered over the satellite map.
 */
export function buildCity3dSceneGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): City3dSceneGeoJson {
  const { buildings, trees } = buildStatic3dScene(cityId);
  return {
    buildings,
    trees,
    landmarks: buildCityLandmarksGeoJson(cityId, locale),
  };
}
