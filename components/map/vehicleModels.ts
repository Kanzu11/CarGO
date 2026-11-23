import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import type { LngLat, Tier, VehicleStatus } from "@/types/fleet";

const METERS_PER_DEG_LAT = 111_320;
const DEG_TO_RAD = Math.PI / 180;

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

/** Strict CarGo status palette for vehicle markers and map indicators. */
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
 * Converts local coordinates (`forwardM` along heading, `rightM` starboard)
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

export function vehicleSpriteKey(
  tier: Tier,
  status: VehicleStatus,
  selected: boolean,
  isPlayerDriver = false,
): string {
  const role = isPlayerDriver && status === "idle" ? "player" : status;
  return `cargo-veh-${tier}-${role}-${selected ? "sel" : "std"}`;
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
        spriteKey: vehicleSpriteKey(v.tier, v.status, v.selected, v.isPlayerDriver),
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
  baseM = 0,
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
      base: baseM,
      height: heightM,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

/**
 * Generates a 3-tier extruded 3D marker pin (ground pad, tall shaft, and 3D head cap)
 * so Pickup and Destination markers read clearly at any camera tilt.
 */
export function buildPin3dFeatures(
  center: LngLat,
  color: string,
  accentColor: string,
  kind: "pickup" | "dropoff",
): Feature<Polygon>[] {
  return [
    buildPin3dPolygon(center, 4.8, 1.2, accentColor, kind, 0),
    buildPin3dPolygon(center, 1.8, 18, color, kind, 1.2),
    buildPin3dPolygon(center, 4.2, 25, color, kind, 18),
  ];
}

function buildBox3dPolygon(
  origin: LngLat,
  forwardOffsetM: number,
  rightOffsetM: number,
  lengthM: number,
  widthM: number,
  bearingDeg: number,
  base: number,
  height: number,
  color: string,
  id: string,
): Feature<Polygon> {
  const fwd = forwardOffsetM * 1.5;
  const rgt = rightOffsetM * 1.5;
  const hl = (lengthM * 1.6) / 2;
  const hw = (widthM * 1.6) / 2;
  const corners: [number, number][] = [
    [fwd + hl, rgt + hw],
    [fwd + hl, rgt - hw],
    [fwd - hl, rgt - hw],
    [fwd - hl, rgt + hw],
  ];
  const ring = corners.map(([f, r]) => localMetersToLngLat(origin, f, r, bearingDeg));
  ring.push(ring[0]!);

  return {
    type: "Feature",
    properties: {
      id,
      base,
      height,
      color,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

function tierBodyColor(tier: Tier, status: VehicleStatus, isPlayerDriver = false): {
  lower: string;
  upper: string;
  cabin: string;
} {
  if (isPlayerDriver && status === "idle") {
    return { lower: "#18181B", upper: "#27272A", cabin: "#09090B" };
  }
  switch (tier) {
    case "bajaj":
      return { lower: "#1E3A8A", upper: "#2563EB", cabin: "#0F172A" };
    case "economy":
      return { lower: "#F8FAFC", upper: "#CBD5E1", cabin: "#334155" };
    case "minivan":
      return { lower: "#F1F5F9", upper: "#1D4ED8", cabin: "#1E293B" };
    case "cargo":
      return { lower: "#E2E8F0", upper: "#F59E0B", cabin: "#1E293B" };
  }
}

/**
 * Generates multi-part 3D extruded vehicle bodies tailored by Ethiopian tier
 * (Bajaj 3-wheeler, Economy sedan, Minivan, Cargo truck) for 60fps MapLibre rendering.
 */
export function buildFleet3dFeatureCollection(
  vehicles: ReadonlyArray<InterpolatedVehicle>,
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];

  for (const v of vehicles) {
    const statusAccent = vehicleStatusColor(v.status, v.isPlayerDriver);
    const palette = tierBodyColor(v.tier, v.status, v.isPlayerDriver);

    if (v.selected) {
      features.push(
        buildBox3dPolygon(v.position, 0, 0, 8.8, 5.2, v.bearing, 0, 0.3, statusAccent, v.id),
      );
    }

    switch (v.tier) {
      case "bajaj":
        features.push(
          buildBox3dPolygon(v.position, -0.35, 0, 4.2, 2.7, v.bearing, 0.2, 1.5, palette.lower, v.id),
          buildBox3dPolygon(v.position, 1.8, 0, 1.5, 1.6, v.bearing, 0.2, 1.4, palette.upper, v.id),
          buildBox3dPolygon(v.position, 0.9, 0, 1.1, 2.2, v.bearing, 1.4, 2.5, palette.cabin, v.id),
          buildBox3dPolygon(v.position, -0.35, 0, 3.6, 2.5, v.bearing, 1.5, 2.9, palette.upper, v.id),
          buildBox3dPolygon(v.position, -0.2, 0, 1.0, 1.2, v.bearing, 2.9, 3.5, statusAccent, v.id),
        );
        break;

      case "economy":
        features.push(
          buildBox3dPolygon(v.position, 0, 0, 6.2, 3.0, v.bearing, 0.2, 1.4, palette.lower, v.id),
          buildBox3dPolygon(v.position, -0.25, 0, 3.4, 2.6, v.bearing, 1.4, 2.5, palette.cabin, v.id),
          buildBox3dPolygon(v.position, -0.3, 0, 2.6, 2.4, v.bearing, 2.5, 2.85, palette.upper, v.id),
          buildBox3dPolygon(v.position, 0.1, 0, 0.9, 1.2, v.bearing, 2.85, 3.4, statusAccent, v.id),
        );
        break;

      case "minivan":
        features.push(
          buildBox3dPolygon(v.position, 0, 0, 7.2, 3.3, v.bearing, 0.2, 1.8, palette.lower, v.id),
          buildBox3dPolygon(v.position, -0.2, 0, 5.4, 3.0, v.bearing, 1.8, 2.8, palette.cabin, v.id),
          buildBox3dPolygon(v.position, -0.25, 0, 4.8, 2.85, v.bearing, 2.8, 3.25, palette.upper, v.id),
          buildBox3dPolygon(v.position, 0.4, 0, 1.0, 1.4, v.bearing, 3.25, 3.85, statusAccent, v.id),
        );
        break;

      case "cargo":
        features.push(
          buildBox3dPolygon(v.position, 0, 0, 8.6, 3.6, v.bearing, 0.2, 1.2, "#334155", v.id),
          buildBox3dPolygon(v.position, 2.5, 0, 2.6, 3.3, v.bearing, 1.2, 3.1, palette.upper, v.id),
          buildBox3dPolygon(v.position, -1.35, 0, 5.2, 3.5, v.bearing, 1.2, 4.5, palette.lower, v.id),
          buildBox3dPolygon(v.position, 2.3, 0, 1.0, 1.4, v.bearing, 3.1, 3.7, statusAccent, v.id),
        );
        break;
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
