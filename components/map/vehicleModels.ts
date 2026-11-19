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
