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
 * Generates a 3-tier extruded 3D marker pin (ground pad, slim shaft, and 3D head cap)
 * so Pickup and Destination markers read clearly at any camera tilt.
 */
export function buildPin3dFeatures(
  center: LngLat,
  color: string,
  accentColor: string,
  kind: "pickup" | "dropoff",
): Feature<Polygon>[] {
  return [
    buildPin3dPolygon(center, 4.2, 0.9, accentColor, kind, 0),
    buildPin3dPolygon(center, 1.3, 18, color, kind, 0.9),
    buildPin3dPolygon(center, 3.6, 25, color, kind, 18),
  ];
}

/**
 * Builds a chamfered/tapered 8-vertex polygonal 3D vehicle hull (`noseTaper` narrows
 * the front bumper/cowling and `rearTaper` rounds the tail) so 3D vehicles read as
 * sculpted automotive forms rather than plain rectangular boxes.
 */
function buildSculptedHull3dPolygon(
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
  noseTaper = 0.72,
  rearTaper = 0.84,
): Feature<Polygon> {
  const scale = 1.18;
  const fwd = forwardOffsetM * scale;
  const rgt = rightOffsetM * scale;
  const hl = (lengthM * scale) / 2;
  const hw = (widthM * scale) / 2;
  const noseShoulder = hl * 0.64;
  const tailShoulder = -hl * 0.68;

  const pts: [number, number][] = [
    [fwd + hl, rgt + hw * noseTaper],
    [fwd + hl, rgt - hw * noseTaper],
    [fwd + noseShoulder, rgt - hw],
    [fwd + tailShoulder, rgt - hw],
    [fwd - hl, rgt - hw * rearTaper],
    [fwd - hl, rgt + hw * rearTaper],
    [fwd + tailShoulder, rgt + hw],
    [fwd + noseShoulder, rgt + hw],
  ];

  const ring = pts.map(([f, r]) => localMetersToLngLat(origin, f, r, bearingDeg));
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
      return { lower: "#0284C7", upper: "#38BDF8", cabin: "#0F172A" };
    case "economy":
      return { lower: "#F8FAFC", upper: "#E2E8F0", cabin: "#1E293B" };
    case "minivan":
      return { lower: "#F59E0B", upper: "#FEF3C7", cabin: "#1E293B" };
    case "cargo":
      return { lower: "#F8FAFC", upper: "#EA580C", cabin: "#1E293B" };
  }
}

/**
 * Generates sculpted, tapered multi-part 3D extruded vehicle bodies tailored by
 * Ethiopian tier (Bajaj 3-wheeler, Economy sedan, Minivan, Cargo truck).
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
        buildSculptedHull3dPolygon(
          v.position,
          0,
          0,
          7.2,
          4.2,
          v.bearing,
          0,
          0.22,
          statusAccent,
          v.id,
          0.8,
          0.8,
        ),
      );
    }

    switch (v.tier) {
      case "bajaj":
        features.push(
          buildSculptedHull3dPolygon(v.position, 1.35, 0, 1.5, 1.3, v.bearing, 0.12, 1.15, palette.upper, v.id, 0.35, 0.9),
          buildSculptedHull3dPolygon(v.position, -0.3, 0, 3.2, 2.15, v.bearing, 0.15, 1.35, palette.lower, v.id, 0.78, 0.85),
          buildSculptedHull3dPolygon(v.position, 0.55, 0, 1.1, 1.85, v.bearing, 1.3, 2.05, palette.cabin, v.id, 0.72, 0.92),
          buildSculptedHull3dPolygon(v.position, -0.35, 0, 2.85, 2.0, v.bearing, 1.35, 2.3, palette.upper, v.id, 0.82, 0.86),
          buildSculptedHull3dPolygon(v.position, -0.15, 0, 0.8, 0.95, v.bearing, 2.3, 2.65, statusAccent, v.id, 0.75, 0.75),
        );
        break;

      case "economy":
        features.push(
          buildSculptedHull3dPolygon(v.position, 0, 0, 4.9, 2.25, v.bearing, 0.15, 1.15, palette.lower, v.id, 0.66, 0.78),
          buildSculptedHull3dPolygon(v.position, -0.2, 0, 2.85, 1.95, v.bearing, 1.15, 1.95, palette.cabin, v.id, 0.7, 0.76),
          buildSculptedHull3dPolygon(v.position, -0.25, 0, 2.1, 1.78, v.bearing, 1.95, 2.2, palette.upper, v.id, 0.82, 0.82),
          buildSculptedHull3dPolygon(v.position, 0.05, 0, 0.75, 0.95, v.bearing, 2.2, 2.52, statusAccent, v.id, 0.75, 0.75),
        );
        break;

      case "minivan":
        features.push(
          buildSculptedHull3dPolygon(v.position, 0, 0, 5.6, 2.45, v.bearing, 0.16, 1.38, palette.lower, v.id, 0.74, 0.86),
          buildSculptedHull3dPolygon(v.position, -0.12, 0, 4.35, 2.25, v.bearing, 1.38, 2.22, palette.cabin, v.id, 0.78, 0.88),
          buildSculptedHull3dPolygon(v.position, -0.18, 0, 3.85, 2.1, v.bearing, 2.22, 2.5, palette.upper, v.id, 0.86, 0.88),
          buildSculptedHull3dPolygon(v.position, 0.3, 0, 0.85, 1.1, v.bearing, 2.5, 2.84, statusAccent, v.id, 0.78, 0.78),
        );
        break;

      case "cargo":
        features.push(
          buildSculptedHull3dPolygon(v.position, 0, 0, 6.6, 2.65, v.bearing, 0.18, 0.95, "#334155", v.id, 0.82, 0.9),
          buildSculptedHull3dPolygon(v.position, 1.95, 0, 2.05, 2.45, v.bearing, 0.95, 2.45, palette.upper, v.id, 0.76, 0.95),
          buildSculptedHull3dPolygon(v.position, -1.05, 0, 4.15, 2.65, v.bearing, 0.95, 3.35, palette.lower, v.id, 0.96, 0.96),
          buildSculptedHull3dPolygon(v.position, 1.85, 0, 0.8, 1.1, v.bearing, 2.45, 2.82, statusAccent, v.id, 0.8, 0.8),
        );
        break;
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
