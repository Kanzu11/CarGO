import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { TIERS } from "@/lib/tiers";
import type { LngLat, Tier, VehicleStatus } from "@/types/fleet";

const METERS_PER_DEG_LAT = 111_320;
const DEG_TO_RAD = Math.PI / 180;

/** Scaled up so 3D vehicles stay readable above road geometry at city zoom. */
export const VEHICLE_FOOTPRINT_SCALE = 2.6;
export const VEHICLE_HEIGHT_SCALE = 2.4;

export interface InterpolatedVehicle {
  id: string;
  tier: Tier;
  status: VehicleStatus;
  position: LngLat;
  bearing: number;
  plate: string;
  selected: boolean;
  isPlayerDriver?: boolean;
}

/** Strict CarGo status palette for 3D vehicle extrusions and 2D sprites. */
export function vehicleStatusColor(status: VehicleStatus, isPlayerDriver = false): string {
  switch (status) {
    case "on_trip":
      return "#047857";
    case "enroute_pickup":
      return "#D97706";
    case "alert":
      return "#DC2626";
    case "offline":
      return "#9CA3AF";
    case "idle":
      return isPlayerDriver ? "#09090B" : "#374151";
  }
}

/**
 * Converts local vehicle coordinates (`forwardM` along heading, `rightM` starboard)
 * into WGS84 `[lng, lat]` around `origin`.
 */
export function localMetersToLngLat(
  origin: LngLat,
  forwardM: number,
  rightM: number,
  bearingDeg: number,
): LngLat {
  const rad = bearingDeg * DEG_TO_RAD;
  const northM = forwardM * Math.cos(rad) - rightM * Math.sin(rad);
  const eastM = forwardM * Math.sin(rad) + rightM * Math.cos(rad);
  const dLat = northM / METERS_PER_DEG_LAT;
  const cosLat = Math.max(0.2, Math.cos(origin[1] * DEG_TO_RAD));
  const dLng = eastM / (METERS_PER_DEG_LAT * cosLat);
  return [origin[0] + dLng, origin[1] + dLat];
}

function makeOrientedQuad(
  origin: LngLat,
  bearingDeg: number,
  rearM: number,
  frontM: number,
  halfRearW: number,
  halfFrontW: number,
): LngLat[] {
  const p0 = localMetersToLngLat(origin, rearM, -halfRearW, bearingDeg);
  const p1 = localMetersToLngLat(origin, rearM, halfRearW, bearingDeg);
  const p2 = localMetersToLngLat(origin, frontM, halfFrontW, bearingDeg);
  const p3 = localMetersToLngLat(origin, frontM, -halfFrontW, bearingDeg);
  return [p0, p1, p2, p3, p0];
}

function makePartFeature(
  v: InterpolatedVehicle,
  ring: LngLat[],
  color: string,
  base: number,
  height: number,
): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {
      id: v.id,
      tier: v.tier,
      status: v.status,
      color,
      base: Number(base.toFixed(2)),
      height: Number(height.toFixed(2)),
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

/**
 * Generates tier-distinct 3D extruded vehicle geometry around `v.position` oriented
 * along `v.bearing`:
 * - Bajaj: tapered 3-wheeler footprint + crisp white front canopy strip
 * - Economy: sedan lower chassis + inset cabin + white windshield strip
 * - Minivan: boxy multi-seat silhouette + white front cab cap
 * - Cargo: forward cab + tall light-grey delivery box
 */
export function buildVehicle3dFeatures(v: InterpolatedVehicle): Feature<Polygon>[] {
  const meta = TIERS[v.tier];
  const len = meta.lengthM * VEHICLE_FOOTPRINT_SCALE;
  const wid = meta.widthM * VEHICLE_FOOTPRINT_SCALE;
  const halfL = len / 2;
  const halfW = wid / 2;
  const fullH = meta.extrusionHeightM * VEHICLE_HEIGHT_SCALE;
  const color = vehicleStatusColor(v.status, v.isPlayerDriver);
  const features: Feature<Polygon>[] = [];

  if (v.selected) {
    const pad = 1.4;
    const haloRing = makeOrientedQuad(
      v.position,
      v.bearing,
      -halfL - pad,
      halfL + pad,
      halfW + pad,
      halfW + pad,
    );
    features.push(makePartFeature(v, haloRing, "#09090B", 0, 0.45));
  }

  switch (v.tier) {
    case "bajaj": {
      const body = makeOrientedQuad(
        v.position,
        v.bearing,
        -halfL,
        halfL,
        halfW,
        halfW * 0.46,
      );
      const canopy = makeOrientedQuad(
        v.position,
        v.bearing,
        halfL * 0.18,
        halfL * 0.72,
        halfW * 0.56,
        halfW * 0.4,
      );
      features.push(makePartFeature(v, body, color, 0, fullH));
      features.push(makePartFeature(v, canopy, "#FFFFFF", fullH, fullH + 0.55));
      break;
    }

    case "economy": {
      const lowerH = fullH * 0.58;
      const chassis = makeOrientedQuad(v.position, v.bearing, -halfL, halfL, halfW, halfW * 0.94);
      const cabin = makeOrientedQuad(
        v.position,
        v.bearing,
        -halfL * 0.48,
        halfL * 0.36,
        halfW * 0.82,
        halfW * 0.8,
      );
      const windshield = makeOrientedQuad(
        v.position,
        v.bearing,
        halfL * 0.32,
        halfL * 0.52,
        halfW * 0.74,
        halfW * 0.74,
      );
      features.push(makePartFeature(v, chassis, color, 0, lowerH));
      features.push(makePartFeature(v, cabin, color, lowerH, fullH));
      features.push(makePartFeature(v, windshield, "#FFFFFF", lowerH, lowerH + 0.45));
      break;
    }

    case "minivan": {
      const body = makeOrientedQuad(v.position, v.bearing, -halfL, halfL, halfW, halfW * 0.95);
      const frontStripe = makeOrientedQuad(
        v.position,
        v.bearing,
        halfL * 0.55,
        halfL * 0.92,
        halfW * 0.82,
        halfW * 0.78,
      );
      features.push(makePartFeature(v, body, color, 0, fullH));
      features.push(makePartFeature(v, frontStripe, "#FFFFFF", fullH, fullH + 0.45));
      break;
    }

    case "cargo": {
      const cab = makeOrientedQuad(
        v.position,
        v.bearing,
        halfL * 0.28,
        halfL,
        halfW * 0.92,
        halfW * 0.88,
      );
      const box = makeOrientedQuad(
        v.position,
        v.bearing,
        -halfL,
        halfL * 0.24,
        halfW,
        halfW,
      );
      const cabVisor = makeOrientedQuad(
        v.position,
        v.bearing,
        halfL * 0.55,
        halfL * 0.9,
        halfW * 0.78,
        halfW * 0.74,
      );
      features.push(makePartFeature(v, cab, color, 0, fullH * 0.76));
      features.push(makePartFeature(v, cabVisor, "#FFFFFF", fullH * 0.76, fullH * 0.76 + 0.45));
      features.push(makePartFeature(v, box, "#E5E7EB", 0.35, fullH));
      break;
    }
  }

  return features;
}

export function buildFleet3dFeatureCollection(
  vehicles: ReadonlyArray<InterpolatedVehicle>,
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];
  for (const v of vehicles) {
    features.push(...buildVehicle3dFeatures(v));
  }
  return {
    type: "FeatureCollection",
    features,
  };
}

export function vehicleSpriteKey(
  status: VehicleStatus,
  selected: boolean,
  isPlayerDriver = false,
): string {
  const role = isPlayerDriver && status === "idle" ? "player" : status;
  return `cargo-chevron-${role}-${selected ? "sel" : "std"}`;
}

export function buildFleetPointFeatureCollection(
  vehicles: ReadonlyArray<InterpolatedVehicle>,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: vehicles.map((v) => ({
      type: "Feature",
      properties: {
        id: v.id,
        tier: v.tier,
        status: v.status,
        bearing: v.bearing,
        plate: v.plate,
        selected: v.selected,
        spriteKey: vehicleSpriteKey(v.status, v.selected, v.isPlayerDriver),
      },
      geometry: {
        type: "Point",
        coordinates: v.position,
      },
    })),
  };
}

/**
 * Generates an 8-sided extruded vertical pin stem so pickup & destination markers
 * stand cleanly off the terrain in tilted 3D camera views.
 */
export function buildPin3dPolygon(
  center: LngLat,
  radiusM: number,
  heightM: number,
  color: string,
  kind: "pickup" | "dropoff",
): Feature<Polygon> {
  const sides = 8;
  const ring: LngLat[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * 360;
    ring.push(localMetersToLngLat(center, radiusM, 0, angle));
  }
  ring.push(ring[0]!);

  return {
    type: "Feature",
    properties: {
      kind,
      color,
      height: heightM,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}
