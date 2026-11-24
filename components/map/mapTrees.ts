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

interface HighRiseSpec {
  center: LngLat;
  bearing: number;
  widthM: number;
  depthM: number;
  podiumH: number;
  towerH: number;
  podiumColor: string;
  facadeColor: string;
}

interface CampusSpec {
  center: LngLat;
  bearing: number;
  wingLengthM: number;
  wingDepthM: number;
  floorsH: number;
  wallColor: string;
}

interface GreenZoneSpec {
  center: LngLat;
  radiusM: number;
  treeCount: number;
}

const URBAN_WALL_PALETTE = [
  "#F2ECE1",
  "#E8DFD1",
  "#DED6C8",
  "#E2E8F0",
  "#DCE4EE",
  "#EFE8DC",
] as const;

const ROOF_TRIM_COLOR = "#FAF8F5";
const GLASS_BAND_COLOR = "#334155";
const PLINTH_STONE_COLOR = "#C4BBAF";
const TRUNK_COLOR = "#5C4033";
const CROWN_DARK = ["#14532D", "#166534"] as const;
const CROWN_MID = ["#15803D", "#16A34A"] as const;
const CROWN_LIGHT = "#22C55E";

// Architectural skylines & campuses designed per Ethiopian city (zero obelisk statues)
const CITY_HIGH_RISES: Record<CityId, ReadonlyArray<HighRiseSpec>> = {
  addis: [
    // Meskel Square / CBE / Finfine Financial Spine
    { center: [38.7598, 9.0121], bearing: -14, widthM: 36, depthM: 28, podiumH: 12, towerH: 68, podiumColor: "#E5DFD3", facadeColor: "#94A3B8" },
    { center: [38.7634, 9.0094], bearing: 18, widthM: 30, depthM: 24, podiumH: 10, towerH: 48, podiumColor: "#EFECE6", facadeColor: "#CBD5E1" },
    { center: [38.7628, 9.0126], bearing: 8, widthM: 28, depthM: 22, podiumH: 10, towerH: 40, podiumColor: "#E5DFD3", facadeColor: "#DCE4EE" },
    { center: [38.7552, 9.0114], bearing: -10, widthM: 32, depthM: 24, podiumH: 11, towerH: 44, podiumColor: "#E8DFD1", facadeColor: "#94A3B8" },
    { center: [38.7506, 9.0064], bearing: 12, widthM: 28, depthM: 22, podiumH: 9, towerH: 34, podiumColor: "#EFECE6", facadeColor: "#CBD5E1" },
    // Kazanchis Commercial & UN-ECA District
    { center: [38.7686, 9.0169], bearing: 12, widthM: 36, depthM: 26, podiumH: 11, towerH: 46, podiumColor: "#E2E8F0", facadeColor: "#94A3B8" },
    { center: [38.7712, 9.0149], bearing: -10, widthM: 28, depthM: 22, podiumH: 10, towerH: 38, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
    // Africa Avenue (Olympia -> Dembel -> Bole Medhanialem)
    { center: [38.7672, 9.0038], bearing: -22, widthM: 32, depthM: 24, podiumH: 11, towerH: 46, podiumColor: "#E2E8F0", facadeColor: "#94A3B8" },
    { center: [38.7775, 9.0011], bearing: -18, widthM: 30, depthM: 24, podiumH: 11, towerH: 42, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
    { center: [38.7881, 8.9994], bearing: 20, widthM: 34, depthM: 24, podiumH: 11, towerH: 44, podiumColor: "#EFECE6", facadeColor: "#94A3B8" },
    { center: [38.7908, 8.9968], bearing: -15, widthM: 28, depthM: 22, podiumH: 10, towerH: 36, podiumColor: "#E2E8F0", facadeColor: "#CBD5E1" },
    // Mexico Square, Hayahulet & Megenagna
    { center: [38.7446, 9.0114], bearing: -12, widthM: 34, depthM: 26, podiumH: 12, towerH: 54, podiumColor: "#E5DFD3", facadeColor: "#94A3B8" },
    { center: [38.7866, 9.0135], bearing: 22, widthM: 28, depthM: 22, podiumH: 10, towerH: 36, podiumColor: "#E2E8F0", facadeColor: "#CBD5E1" },
    { center: [38.8002, 9.0194], bearing: -16, widthM: 32, depthM: 24, podiumH: 11, towerH: 40, podiumColor: "#E8DFD1", facadeColor: "#94A3B8" },
  ],
  adama: [
    // Posta Bet, Franko & Central Adama Commercial Corridor
    { center: [39.2685, 8.5421], bearing: 38, widthM: 30, depthM: 22, podiumH: 9, towerH: 34, podiumColor: "#EFECE6", facadeColor: "#94A3B8" },
    { center: [39.2704, 8.5408], bearing: -52, widthM: 28, depthM: 22, podiumH: 9, towerH: 30, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
    { center: [39.2738, 8.5474], bearing: 42, widthM: 32, depthM: 24, podiumH: 10, towerH: 36, podiumColor: "#E2E8F0", facadeColor: "#94A3B8" },
    { center: [39.2756, 8.5461], bearing: -48, widthM: 26, depthM: 20, podiumH: 8, towerH: 28, podiumColor: "#F2ECE1", facadeColor: "#DCE4EE" },
    { center: [39.2641, 8.5372], bearing: 40, widthM: 28, depthM: 22, podiumH: 9, towerH: 30, podiumColor: "#E8DFD1", facadeColor: "#94A3B8" },
    { center: [39.2818, 8.5554], bearing: 44, widthM: 28, depthM: 22, podiumH: 9, towerH: 28, podiumColor: "#EFECE6", facadeColor: "#CBD5E1" },
  ],
  hawassa: [
    // Piassa, St. Gabriel, Lake Shore Resorts & Atote Commercial Plazas
    { center: [38.4754, 7.0529], bearing: 6, widthM: 30, depthM: 22, podiumH: 9, towerH: 34, podiumColor: "#EFECE6", facadeColor: "#94A3B8" },
    { center: [38.4772, 7.0515], bearing: -8, widthM: 28, depthM: 22, podiumH: 9, towerH: 30, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
    { center: [38.4646, 7.0524], bearing: 12, widthM: 34, depthM: 24, podiumH: 9, towerH: 28, podiumColor: "#F2ECE1", facadeColor: "#94A3B8" },
    { center: [38.4774, 7.0454], bearing: 4, widthM: 30, depthM: 22, podiumH: 9, towerH: 32, podiumColor: "#E2E8F0", facadeColor: "#CBD5E1" },
    { center: [38.4864, 7.0418], bearing: -14, widthM: 28, depthM: 20, podiumH: 8, towerH: 26, podiumColor: "#E8DFD1", facadeColor: "#94A3B8" },
    { center: [38.4718, 7.0661], bearing: 20, widthM: 36, depthM: 24, podiumH: 8, towerH: 24, podiumColor: "#F2ECE1", facadeColor: "#DCE4EE" },
  ],
  worabe: [
    // Worabe Town Center, Civic Admin Square & K'ali K'esa Bota Commercial Hubs
    { center: [38.1864, 7.8529], bearing: 18, widthM: 28, depthM: 20, podiumH: 8, towerH: 26, podiumColor: "#EFECE6", facadeColor: "#94A3B8" },
    { center: [38.1878, 7.8519], bearing: -16, widthM: 26, depthM: 20, podiumH: 8, towerH: 22, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
    { center: [38.1855, 7.8489], bearing: 14, widthM: 30, depthM: 22, podiumH: 8, towerH: 24, podiumColor: "#E2E8F0", facadeColor: "#94A3B8" },
    { center: [38.1846, 7.8446], bearing: 20, widthM: 28, depthM: 20, podiumH: 8, towerH: 26, podiumColor: "#F2ECE1", facadeColor: "#94A3B8" },
    { center: [38.1816, 7.8362], bearing: 28, widthM: 30, depthM: 22, podiumH: 8, towerH: 24, podiumColor: "#E8DFD1", facadeColor: "#CBD5E1" },
  ],
};

const CITY_CAMPUSES: Record<CityId, ReadonlyArray<CampusSpec>> = {
  addis: [
    { center: [38.7626, 9.0338], bearing: 8, wingLengthM: 46, wingDepthM: 16, floorsH: 16, wallColor: "#EFECE6" },
    { center: [38.7962, 8.9838], bearing: 10, wingLengthM: 64, wingDepthM: 22, floorsH: 18, wallColor: "#E2E8F0" },
  ],
  adama: [
    { center: [39.2912, 8.5626], bearing: 42, wingLengthM: 52, wingDepthM: 16, floorsH: 16, wallColor: "#EFECE6" },
    { center: [39.2794, 8.5416], bearing: -45, wingLengthM: 44, wingDepthM: 15, floorsH: 14, wallColor: "#F2ECE1" },
  ],
  hawassa: [
    { center: [38.4952, 7.0531], bearing: 6, wingLengthM: 54, wingDepthM: 16, floorsH: 16, wallColor: "#EFECE6" },
    { center: [38.4842, 7.0612], bearing: -6, wingLengthM: 44, wingDepthM: 16, floorsH: 13, wallColor: "#E8DFD1" },
  ],
  worabe: [
    { center: [38.1902, 7.8566], bearing: 16, wingLengthM: 48, wingDepthM: 15, floorsH: 15, wallColor: "#EFECE6" },
    { center: [38.1769, 7.8339], bearing: 24, wingLengthM: 44, wingDepthM: 15, floorsH: 14, wallColor: "#F2ECE1" },
  ],
};

const CITY_GREEN_ZONES: Record<CityId, ReadonlyArray<GreenZoneSpec>> = {
  addis: [
    { center: [38.7615, 9.0215], radiusM: 82, treeCount: 14 },
    { center: [38.7582, 9.0092], radiusM: 68, treeCount: 12 },
    { center: [38.7682, 9.0145], radiusM: 58, treeCount: 10 },
    { center: [38.7882, 8.9992], radiusM: 52, treeCount: 8 },
  ],
  adama: [
    { center: [39.2896, 8.5622], radiusM: 68, treeCount: 12 },
    { center: [39.2702, 8.5424], radiusM: 54, treeCount: 9 },
    { center: [39.2752, 8.5476], radiusM: 50, treeCount: 8 },
  ],
  hawassa: [
    { center: [38.4648, 7.0508], radiusM: 76, treeCount: 14 },
    { center: [38.4938, 7.0538], radiusM: 66, treeCount: 12 },
    { center: [38.4758, 7.0458], radiusM: 52, treeCount: 8 },
  ],
  worabe: [
    { center: [38.1894, 7.8559], radiusM: 56, treeCount: 10 },
    { center: [38.1856, 7.8478], radiusM: 48, treeCount: 8 },
    { center: [38.1778, 7.8346], radiusM: 48, treeCount: 8 },
  ],
};

const sceneCache = new Map<
  CityId,
  { buildings: FeatureCollection<Polygon>; trees: FeatureCollection<Polygon> }
>();

function buildRectRing(
  center: LngLat,
  lengthForwardM: number,
  widthRightM: number,
  bearing: number,
): LngLat[] {
  const hl = lengthForwardM / 2;
  const hw = widthRightM / 2;
  const corners: [number, number][] = [
    [hl, hw],
    [hl, -hw],
    [-hl, -hw],
    [-hl, hw],
  ];
  const ring = corners.map(([f, r]) => localMetersToLngLat(center, f, r, bearing));
  ring.push(ring[0]!);
  return ring;
}

function buildOctagonRing(center: LngLat, radiusM: number, rotDeg = 0): LngLat[] {
  const ring: LngLat[] = [];
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    ring.push(localMetersToLngLat(center, radiusM, 0, rotDeg + (i / sides) * 360));
  }
  ring.push(ring[0]!);
  return ring;
}

/**
 * Modern curtain-wall commercial high-rise: stone street podium, recessed dark-glass
 * atrium reveal, asymmetrical/flush glass tower shaft, crisp roof parapet rim, and
 * offset mechanical core (never a centered wedding-cake pyramid).
 */
function appendModernHighRise(features: Feature<Polygon>[], spec: HighRiseSpec): void {
  const towerCenter = localMetersToLngLat(
    spec.center,
    spec.depthM * 0.06,
    -spec.widthM * 0.05,
    spec.bearing,
  );
  const coreCenter = localMetersToLngLat(
    towerCenter,
    -spec.depthM * 0.14,
    spec.widthM * 0.12,
    spec.bearing,
  );
  const towerW = spec.widthM * 0.76;
  const towerD = spec.depthM * 0.78;
  const revealTop = spec.podiumH + 1.6;

  features.push(
    // 1. Street-level stone plinth
    {
      type: "Feature",
      properties: { base: 0, height: 1.5, color: PLINTH_STONE_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(spec.center, spec.depthM * 1.06, spec.widthM * 1.06, spec.bearing)],
      },
    },
    // 2. Retail / commercial podium
    {
      type: "Feature",
      properties: { base: 1.5, height: spec.podiumH, color: spec.podiumColor },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(spec.center, spec.depthM, spec.widthM, spec.bearing)],
      },
    },
    // 3. Podium roof terrace parapet
    {
      type: "Feature",
      properties: { base: spec.podiumH, height: spec.podiumH + 0.65, color: ROOF_TRIM_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(spec.center, spec.depthM * 1.01, spec.widthM * 1.01, spec.bearing)],
      },
    },
    // 4. Recessed dark-glass lobby/mezzanine reveal
    {
      type: "Feature",
      properties: { base: spec.podiumH, height: revealTop, color: GLASS_BAND_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(towerCenter, towerD * 0.94, towerW * 0.94, spec.bearing)],
      },
    },
    // 5. Main curtain-wall tower shaft
    {
      type: "Feature",
      properties: { base: revealTop, height: spec.towerH - 0.8, color: spec.facadeColor },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(towerCenter, towerD, towerW, spec.bearing)],
      },
    },
    // 6. Crisp flat architectural roof parapet crown
    {
      type: "Feature",
      properties: { base: spec.towerH - 0.8, height: spec.towerH, color: ROOF_TRIM_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(towerCenter, towerD * 1.02, towerW * 1.02, spec.bearing)],
      },
    },
    // 7. Offset rooftop elevator/HVAC bulkhead
    {
      type: "Feature",
      properties: { base: spec.towerH, height: spec.towerH + 2.6, color: "#64748B" },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(coreCenter, towerD * 0.34, towerW * 0.36, spec.bearing)],
      },
    },
  );
}

/**
 * L-shaped institutional campus (universities, referral hospitals, terminals):
 * primary academic/ward bar, perpendicular L-wing, glass entrance atrium, and roof parapets.
 */
function appendCourtyardCampus(features: Feature<Polygon>[], spec: CampusSpec): void {
  const sideWingCenter = localMetersToLngLat(
    spec.center,
    spec.wingLengthM * 0.32,
    spec.wingDepthM * 0.95,
    spec.bearing,
  );
  const atriumCenter = localMetersToLngLat(
    spec.center,
    spec.wingLengthM * 0.16,
    spec.wingDepthM * 0.45,
    spec.bearing,
  );
  const secondaryH = Math.round(spec.floorsH * 0.78);

  features.push(
    {
      type: "Feature",
      properties: { base: 0, height: spec.floorsH - 0.6, color: spec.wallColor },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(spec.center, spec.wingDepthM, spec.wingLengthM, spec.bearing)],
      },
    },
    {
      type: "Feature",
      properties: { base: spec.floorsH - 0.6, height: spec.floorsH, color: ROOF_TRIM_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectRing(spec.center, spec.wingDepthM * 1.03, spec.wingLengthM * 1.01, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: 0, height: secondaryH - 0.6, color: "#E6DEC8" },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectRing(sideWingCenter, spec.wingLengthM * 0.65, spec.wingDepthM * 0.92, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: secondaryH - 0.6, height: secondaryH, color: ROOF_TRIM_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [
          buildRectRing(sideWingCenter, spec.wingLengthM * 0.66, spec.wingDepthM * 0.95, spec.bearing),
        ],
      },
    },
    {
      type: "Feature",
      properties: { base: 0, height: Math.round(spec.floorsH * 0.58), color: "#64748B" },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(atriumCenter, spec.wingDepthM * 0.8, spec.wingDepthM * 0.9, spec.bearing)],
      },
    },
  );
}

/**
 * Multi-tier urban street-front building (ground shop plinth + main multi-story
 * apartment/commercial body + crisp rooftop parapet) lining avenue blocks.
 */
function appendUrbanStreetBuilding(
  features: Feature<Polygon>[],
  center: LngLat,
  alongRoadM: number,
  depthM: number,
  heightM: number,
  bearing: number,
  wallColor: string,
): void {
  features.push(
    {
      type: "Feature",
      properties: { base: 0, height: 1.4, color: PLINTH_STONE_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(center, alongRoadM * 1.02, depthM * 1.02, bearing)],
      },
    },
    {
      type: "Feature",
      properties: { base: 1.4, height: heightM - 0.55, color: wallColor },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(center, alongRoadM, depthM, bearing)],
      },
    },
    {
      type: "Feature",
      properties: { base: heightM - 0.55, height: heightM, color: ROOF_TRIM_COLOR },
      geometry: {
        type: "Polygon",
        coordinates: [buildRectRing(center, alongRoadM * 1.02, depthM * 1.02, bearing)],
      },
    },
  );
}

function appendBoulevardTree(
  features: Feature<Polygon>[],
  center: LngLat,
  scale: number,
  rng: () => number,
): void {
  const rot = rng() * 45;
  const trunkH = Number((2.1 + rng() * 0.5).toFixed(2));
  const lowerR = (2.8 + rng() * 0.9) * scale;
  const lowerH = Number((trunkH + 3.0 + rng() * 1.0).toFixed(2));
  const upperR = lowerR * 0.66;
  const upperBase = Number((lowerH - 0.8).toFixed(2));
  const upperH = Number((lowerH + 2.0 + rng() * 0.8).toFixed(2));

  features.push(
    {
      type: "Feature",
      properties: { kind: "trunk", base: 0, height: trunkH, color: TRUNK_COLOR },
      geometry: { type: "Polygon", coordinates: [buildOctagonRing(center, 0.55 * scale, rot)] },
    },
    {
      type: "Feature",
      properties: { kind: "crown", base: trunkH, height: lowerH, color: pickRandom(CROWN_DARK, rng) },
      geometry: { type: "Polygon", coordinates: [buildOctagonRing(center, lowerR, rot)] },
    },
    {
      type: "Feature",
      properties: {
        kind: "crown",
        base: upperBase,
        height: upperH,
        color: rng() > 0.45 ? pickRandom(CROWN_MID, rng) : CROWN_LIGHT,
      },
      geometry: { type: "Polygon", coordinates: [buildOctagonRing(center, upperR, rot + 22)] },
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
  const rng = createPrng(hashSeed(`designed-city-3d-v2:${cityId}`));

  const buildings: Feature<Polygon>[] = [];
  const trees: Feature<Polygon>[] = [];
  const occupiedCenters: LngLat[] = [];

  // 1. Signature modern commercial high-rises
  for (const hr of CITY_HIGH_RISES[cityId]) {
    appendModernHighRise(buildings, hr);
    occupiedCenters.push(hr.center);
  }

  // 2. L-shaped institutional campuses (Universities, Hospitals, Terminals)
  for (const campus of CITY_CAMPUSES[cityId]) {
    appendCourtyardCampus(buildings, campus);
    occupiedCenters.push(campus.center);
  }

  // 3. Boulevard street-wall urban blocks & avenue sidewalk trees along real road corridors
  const nodeCoords = Object.values(city.graph.nodes);
  const isClearOfJunctionAndOccupied = (pt: LngLat): boolean => {
    for (const junction of nodeCoords) {
      if (haversineMeters(pt, junction) < 34) return false;
    }
    for (const taken of occupiedCenters) {
      if (haversineMeters(pt, taken) < 28) return false;
    }
    return true;
  };

  const maxBlocks = cityId === "addis" ? 130 : cityId === "adama" ? 110 : 95;
  let blockCount = 0;

  for (const [fromId, toId] of city.graph.edges) {
    const a = city.graph.nodes[fromId];
    const b = city.graph.nodes[toId];
    if (!a || !b) continue;

    const segMeters = haversineMeters(a, b);
    if (segMeters < 180) continue;

    const roadBearing = bearingDeg(a, b);
    const distToCityCenter = haversineMeters(lerpLngLat(a, b, 0.5), city.center);
    const isDowntown = distToCityCenter < 1400;

    // Step along each avenue every ~95m, placing street-front buildings on left & right setbacks
    const stepCount = Math.min(7, Math.floor((segMeters - 90) / 95));
    for (let sIdx = 1; sIdx <= stepCount; sIdx++) {
      const t = sIdx / (stepCount + 1);
      const spinePt = lerpLngLat(a, b, t);

      for (const side of [-1, 1] as const) {
        if (blockCount >= maxBlocks) break;
        if (rng() < 0.24) continue;

        const setbackM = randomBetween(24, 33, rng) * side;
        const lotCenter = localMetersToLngLat(spinePt, 0, setbackM, roadBearing);
        if (!isClearOfJunctionAndOccupied(lotCenter)) continue;

        const alongM = randomBetween(18, 28, rng);
        const depthM = randomBetween(14, 21, rng);
        const baseFloors = isDowntown
          ? Math.floor(randomBetween(3, 6.8, rng))
          : Math.floor(randomBetween(2, 4.6, rng));
        const heightM = Number((baseFloors * 3.5 + randomBetween(0.4, 1.4, rng)).toFixed(1));
        const color = pickRandom(URBAN_WALL_PALETTE, rng);

        appendUrbanStreetBuilding(buildings, lotCenter, alongM, depthM, heightM, roadBearing, color);
        occupiedCenters.push(lotCenter);
        blockCount += 1;

        // Sidewalk tree between road curb and building setback
        if (rng() < 0.45) {
          const treePt = localMetersToLngLat(spinePt, alongM * 0.35, 13.5 * side, roadBearing);
          appendBoulevardTree(trees, treePt, randomBetween(0.85, 1.15, rng), rng);
        }
      }
    }
  }

  // 4. Campus & park green zones
  for (const zone of CITY_GREEN_ZONES[cityId]) {
    for (let i = 0; i < zone.treeCount; i++) {
      const r = randomBetween(10, zone.radiusM, rng);
      const deg = (i / zone.treeCount) * 360 + randomBetween(-14, 14, rng);
      const pos = localMetersToLngLat(zone.center, r, 0, deg);
      appendBoulevardTree(trees, pos, randomBetween(0.95, 1.3, rng), rng);
    }
  }

  const built = {
    buildings: { type: "FeatureCollection" as const, features: buildings },
    trees: { type: "FeatureCollection" as const, features: trees },
  };
  sceneCache.set(cityId, built);
  return built;
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
 * Returns designed 3D architectural buildings (high-rises, courtyard campuses,
 * and avenue street-blocks), boulevard/park 3D trees, and localized landmark pins
 * across Addis Ababa, Adama, Hawassa, and Worabe — with zero fake obelisk statues.
 */
export function buildCity3dSceneGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): City3dSceneGeoJson {
  const staticScene = buildStatic3dScene(cityId);
  return {
    buildings: staticScene.buildings,
    trees: staticScene.trees,
    landmarks: buildCityLandmarksGeoJson(cityId, locale),
  };
}
