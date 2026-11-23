import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { localMetersToLngLat } from "@/components/map/vehicleModels";
import { CITIES } from "@/lib/cities";
import { bearingDeg, haversineMeters, lerpLngLat } from "@/lib/geo";
import { localizePlaceName } from "@/lib/i18n";
import { createPrng, hashSeed, pickRandom, randomBetween } from "@/lib/random";
import type { CityId, LngLat, Locale } from "@/types/fleet";

export interface CityEnvironmentGeoJson {
  parks: FeatureCollection<Polygon>;
  trees: FeatureCollection<Polygon>;
  landmarks: FeatureCollection<Point>;
}

const PARK_COLORS = ["#DCFCE7", "#D1FAE5"] as const;
const LOWER_CROWN_COLORS = ["#15803D", "#16A34A", "#047857", "#166534"] as const;
const UPPER_CROWN_COLORS = ["#22C55E", "#16A34A"] as const;
const TRUNK_COLOR = "#78350F";

const geometryCache = new Map<
  CityId,
  { parks: FeatureCollection<Polygon>; trees: FeatureCollection<Polygon> }
>();

function buildCirclePolygon(
  center: LngLat,
  radiusM: number,
  sides: number,
  rotationOffsetDeg = 0,
): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotationOffsetDeg + (i / sides) * 360;
    ring.push(localMetersToLngLat(center, radiusM, 0, angle));
  }
  ring.push(ring[0]!);
  return ring;
}

function appendTreeFeatures(
  features: Feature<Polygon>[],
  center: LngLat,
  scale: number,
  rng: () => number,
): void {
  const trunkRadius = 0.65 * scale;
  const trunkHeight = Number((1.7 + rng() * 0.6).toFixed(2));
  const lowerRadius = (2.8 + rng() * 1.4) * scale;
  const lowerHeight = Number((trunkHeight + 3.6 + rng() * 2.8).toFixed(2));
  const upperRadius = lowerRadius * 0.62;
  const upperBase = Number((lowerHeight - 1.2).toFixed(2));
  const upperHeight = Number((lowerHeight + 1.8 + rng() * 2.2).toFixed(2));
  const rotation = rng() * 45;

  features.push({
    type: "Feature",
    properties: {
      kind: "trunk",
      base: 0,
      height: trunkHeight,
      color: TRUNK_COLOR,
    },
    geometry: {
      type: "Polygon",
      coordinates: [buildCirclePolygon(center, trunkRadius, 6, rotation)],
    },
  });

  features.push({
    type: "Feature",
    properties: {
      kind: "crown",
      base: trunkHeight,
      height: lowerHeight,
      color: pickRandom(LOWER_CROWN_COLORS, rng),
    },
    geometry: {
      type: "Polygon",
      coordinates: [buildCirclePolygon(center, lowerRadius, 8, rotation)],
    },
  });

  features.push({
    type: "Feature",
    properties: {
      kind: "crown",
      base: upperBase,
      height: upperHeight,
      color: pickRandom(UPPER_CROWN_COLORS, rng),
    },
    geometry: {
      type: "Polygon",
      coordinates: [buildCirclePolygon(center, upperRadius, 8, rotation + 22.5)],
    },
  });
}

function buildStaticCityGeometry(cityId: CityId): {
  parks: FeatureCollection<Polygon>;
  trees: FeatureCollection<Polygon>;
} {
  const cached = geometryCache.get(cityId);
  if (cached) return cached;

  const city = CITIES[cityId];
  const rng = createPrng(hashSeed(`trees:${cityId}`));

  const parkFeatures: Feature<Polygon>[] = [];
  const treeFeatures: Feature<Polygon>[] = [];

  // 1. Campus / lakeside parks + landmark tree groves
  for (let idx = 0; idx < city.landmarks.length; idx++) {
    const landmark = city.landmarks[idx]!;
    const parkRadius = randomBetween(46, 68, rng);
    const parkCenter = localMetersToLngLat(
      landmark.coords,
      randomBetween(-14, 14, rng),
      randomBetween(-14, 14, rng),
      rng() * 360,
    );

    parkFeatures.push({
      type: "Feature",
      properties: {
        id: `park-${landmark.id}`,
        color: PARK_COLORS[idx % PARK_COLORS.length]!,
      },
      geometry: {
        type: "Polygon",
        coordinates: [buildCirclePolygon(parkCenter, parkRadius, 12, rng() * 30)],
      },
    });

    const groveCount = Math.floor(randomBetween(6, 9, rng));
    for (let t = 0; t < groveCount; t++) {
      const distM = randomBetween(24, parkRadius - 6, rng);
      const angleDeg = (t / groveCount) * 360 + randomBetween(-14, 14, rng);
      const treePos = localMetersToLngLat(landmark.coords, distM, 0, angleDeg);
      appendTreeFeatures(treeFeatures, treePos, randomBetween(0.95, 1.35, rng), rng);
    }
  }

  // 2. Boulevard street trees along city road edges (offset 15–21m off roadway)
  const MAX_BOULEVARD_TREES = 96;
  let boulevardTrees = 0;

  for (const [fromId, toId] of city.graph.edges) {
    if (boulevardTrees >= MAX_BOULEVARD_TREES) break;
    const from = city.graph.nodes[fromId];
    const to = city.graph.nodes[toId];
    if (!from || !to) continue;

    const lengthM = haversineMeters(from, to);
    if (lengthM < 110) continue;

    const bearing = bearingDeg(from, to);
    const steps = Math.min(3, Math.max(1, Math.floor(lengthM / 180)));

    for (let s = 1; s <= steps; s++) {
      if (boulevardTrees >= MAX_BOULEVARD_TREES) break;
      const frac = s / (steps + 1);
      const along = lerpLngLat(from, to, frac);
      const side = rng() > 0.5 ? 1 : -1;
      const offsetM = side * randomBetween(15, 21, rng);
      const treePos = localMetersToLngLat(along, 0, offsetM, bearing);
      appendTreeFeatures(treeFeatures, treePos, randomBetween(0.85, 1.2, rng), rng);
      boulevardTrees++;
    }
  }

  const result = {
    parks: {
      type: "FeatureCollection" as const,
      features: parkFeatures,
    },
    trees: {
      type: "FeatureCollection" as const,
      features: treeFeatures,
    },
  };
  geometryCache.set(cityId, result);
  return result;
}

/**
 * Generates deterministic lush parks, 3D multi-tier green trees (trunks + crowns),
 * and localized landmark anchor points for the given Ethiopian city.
 */
export function buildCityEnvironmentGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): CityEnvironmentGeoJson {
  const { parks, trees } = buildStaticCityGeometry(cityId);
  const city = CITIES[cityId];

  const landmarkFeatures: Feature<Point>[] = city.landmarks.map((landmark) => ({
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
    parks,
    trees,
    landmarks: {
      type: "FeatureCollection",
      features: landmarkFeatures,
    },
  };
}
