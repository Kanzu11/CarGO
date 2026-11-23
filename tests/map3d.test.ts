import { describe, expect, it } from "vitest";
import { CAMERA_PRESETS } from "@/components/map/map3d";
import { buildCityEnvironmentGeoJson } from "@/components/map/mapTrees";
import {
  buildFleetPointFeatureCollection,
  buildPin3dPolygon,
  localMetersToLngLat,
  vehicleSpriteKey,
  vehicleStatusColor,
  type InterpolatedVehicle,
} from "@/components/map/vehicleModels";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { haversineMeters } from "@/lib/geo";
import { TIER_ORDER } from "@/lib/tiers";
import type { LngLat } from "@/types/fleet";

describe("3D map vehicle sprites, pins & geometry", () => {
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

  it("assigns distinct vehicle sprite keys per tier, status, selection & player role", () => {
    const sample: InterpolatedVehicle[] = [
      { id: "V1", tier: "bajaj", status: "on_trip", position: origin, bearing: 45, plate: "OR 3-A10001", selected: false },
      { id: "V2", tier: "economy", status: "enroute_pickup", position: origin, bearing: 120, plate: "OR 3-B20002", selected: false },
      { id: "V3", tier: "minivan", status: "idle", position: origin, bearing: 200, plate: "OR 1-C30003", selected: false },
      { id: "V4", tier: "cargo", status: "alert", position: origin, bearing: 310, plate: "OR 3-A40004", selected: true },
    ];

    const points = buildFleetPointFeatureCollection(sample);
    expect(points.features).toHaveLength(4);
    expect(points.features[0]?.properties?.spriteKey).toBe("cargo-veh-bajaj-on_trip-std");
    expect(points.features[1]?.properties?.spriteKey).toBe("cargo-veh-economy-enroute_pickup-std");
    expect(points.features[2]?.properties?.spriteKey).toBe("cargo-veh-minivan-idle-std");
    expect(points.features[3]?.properties?.spriteKey).toBe("cargo-veh-cargo-alert-sel");

    const keys = new Set(TIER_ORDER.map((tier) => vehicleSpriteKey(tier, "idle", false, true)));
    expect(keys.size).toBe(4);
    expect(vehicleSpriteKey("economy", "idle", false, true)).toBe("cargo-veh-economy-player-std");
  });

  it("maps vehicle statuses to strict CarGo hex palette", () => {
    expect(vehicleStatusColor("on_trip")).toBe("#047857");
    expect(vehicleStatusColor("enroute_pickup")).toBe("#D97706");
    expect(vehicleStatusColor("alert")).toBe("#DC2626");
    expect(vehicleStatusColor("offline")).toBe("#9CA3AF");
    expect(vehicleStatusColor("idle", true)).toBe("#09090B");
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

  it("generates parks, 3D trees (trunks + crowns) and localized landmarks for all 4 cities", () => {
    for (const cityId of CITY_ORDER) {
      const env = buildCityEnvironmentGeoJson(cityId, "en");
      expect(env.parks.features.length).toBeGreaterThan(0);
      expect(env.trees.features.length).toBeGreaterThan(100);
      expect(env.landmarks.features).toHaveLength(CITIES[cityId].landmarks.length);

      let hasTrunk = false;
      let hasCrown = false;
      for (const tree of env.trees.features) {
        const ring = tree.geometry.coordinates[0]!;
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        const base = Number(tree.properties?.base ?? 0);
        const height = Number(tree.properties?.height ?? 0);
        expect(height).toBeGreaterThan(base);
        if (tree.properties?.kind === "trunk") hasTrunk = true;
        if (tree.properties?.kind === "crown") hasCrown = true;
      }
      expect(hasTrunk).toBe(true);
      expect(hasCrown).toBe(true);
    }

    const amharicEnv = buildCityEnvironmentGeoJson("adama", "am");
    const firstLabel = String(amharicEnv.landmarks.features[0]?.properties?.label ?? "");
    expect(firstLabel).toMatch(/[\u1200-\u137F]/);
  });
});
