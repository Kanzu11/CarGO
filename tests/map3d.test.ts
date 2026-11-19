import { describe, expect, it } from "vitest";
import { CAMERA_PRESETS } from "@/components/map/map3d";
import {
  buildFleet3dFeatureCollection,
  buildFleetPointFeatureCollection,
  buildPin3dPolygon,
  localMetersToLngLat,
  vehicleSpriteKey,
  vehicleStatusColor,
  type InterpolatedVehicle,
} from "@/components/map/vehicleModels";
import { haversineMeters } from "@/lib/geo";
import type { LngLat } from "@/types/fleet";

describe("3D map vehicle & pin geometry", () => {
  const origin: LngLat = [39.27, 8.54];

  it("offsets local meter coordinates accurately by compass bearing", () => {
    const north = localMetersToLngLat(origin, 100, 0, 0);
    const east = localMetersToLngLat(origin, 100, 0, 90);
    const south = localMetersToLngLat(origin, 100, 0, 180);
    const west = localMetersToLngLat(origin, 100, 0, 270);

    expect(north[1]).toBeGreaterThan(origin[1]);
    expect(east[0]).toBeGreaterThan(origin[0]);
    expect(south[1]).toBeLessThan(origin[1]);
    expect(west[0]).toBeLessThan(origin[0]);

    expect(haversineMeters(origin, north)).toBeCloseTo(100, 0);
    expect(haversineMeters(origin, east)).toBeCloseTo(100, 0);
  });

  it("builds valid closed 3D polygons across all 4 Ethiopian vehicle tiers", () => {
    const sample: InterpolatedVehicle[] = [
      { id: "V1", tier: "bajaj", status: "on_trip", position: origin, bearing: 45, plate: "OR 3-A10001", selected: false },
      { id: "V2", tier: "economy", status: "enroute_pickup", position: origin, bearing: 120, plate: "OR 3-B20002", selected: false },
      { id: "V3", tier: "minivan", status: "idle", position: origin, bearing: 200, plate: "OR 1-C30003", selected: false },
      { id: "V4", tier: "cargo", status: "alert", position: origin, bearing: 310, plate: "OR 3-A40004", selected: true },
    ];

    const fc = buildFleet3dFeatureCollection(sample);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBeGreaterThanOrEqual(8);

    for (const feature of fc.features) {
      const ring = feature.geometry.coordinates[0]!;
      expect(ring).toHaveLength(5);
      expect(ring[0]).toEqual(ring[4]);
      expect(feature.properties?.height).toBeGreaterThan(0);
    }

    const cargoHeights = fc.features
      .filter((f) => f.properties?.id === "V4")
      .map((f) => Number(f.properties?.height ?? 0));
    const bajajHeights = fc.features
      .filter((f) => f.properties?.id === "V1")
      .map((f) => Number(f.properties?.height ?? 0));
    expect(Math.max(...cargoHeights)).toBeGreaterThan(Math.max(...bajajHeights));

    // Selected vehicle includes a crisp #09090B selection ring polygon
    const selectedRing = fc.features.find(
      (f) => f.properties?.id === "V4" && f.properties?.color === "#09090B",
    );
    expect(selectedRing).toBeDefined();
  });

  it("maps vehicle statuses to strict CarGo hex palette and sprite keys", () => {
    expect(vehicleStatusColor("on_trip")).toBe("#047857");
    expect(vehicleStatusColor("enroute_pickup")).toBe("#D97706");
    expect(vehicleStatusColor("alert")).toBe("#DC2626");
    expect(vehicleStatusColor("offline")).toBe("#9CA3AF");
    expect(vehicleStatusColor("idle", true)).toBe("#09090B");

    expect(vehicleSpriteKey("on_trip", false)).toBe("cargo-chevron-on_trip-std");
    expect(vehicleSpriteKey("alert", true)).toBe("cargo-chevron-alert-sel");
    expect(vehicleSpriteKey("idle", false, true)).toBe("cargo-chevron-player-std");

    const points = buildFleetPointFeatureCollection([
      { id: "V1", tier: "bajaj", status: "on_trip", position: origin, bearing: 90, plate: "OR 3-A10001", selected: false },
    ]);
    expect(points.features).toHaveLength(1);
    expect(points.features[0]?.properties?.spriteKey).toBe("cargo-chevron-on_trip-std");
  });

  it("builds a closed 8-sided 3D pin stem and valid camera presets", () => {
    const pin = buildPin3dPolygon(origin, 2.2, 22, "#09090B", "pickup");
    const ring = pin.geometry.coordinates[0]!;
    expect(ring).toHaveLength(9);
    expect(ring[0]).toEqual(ring[8]);
    expect(pin.properties?.height).toBe(22);

    expect(CAMERA_PRESETS["flat-2d"].pitch).toBe(0);
    expect(CAMERA_PRESETS["trip-follow"].pitch).toBeLessThanOrEqual(65);
    expect(CAMERA_PRESETS["rider-pickup"].pitch).toBeGreaterThan(0);
  });
});
