import { describe, expect, it } from "vitest";
import {
  CAMERA_PRESETS,
  ESRI_WORLD_IMAGERY_TILES,
  MAP_MAX_ZOOM,
  SATELLITE_MAX_ZOOM,
} from "@/components/map/map3d";
import { buildCity3dSceneGeoJson } from "@/components/map/mapTrees";
import {
  buildFleet3dFeatureCollection,
  buildFleetPointFeatureCollection,
  buildPin3dFeatures,
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

    // 3D fleet vehicles & 3-part 3D pins
    const fleet3d = buildFleet3dFeatureCollection([
      { id: "V1", tier: "bajaj", status: "on_trip", position: origin, bearing: 45, plate: "AA 3-A10001", selected: true },
      { id: "V2", tier: "economy", status: "idle", position: origin, bearing: 90, plate: "AA 3-B20002", selected: false },
      { id: "V3", tier: "minivan", status: "enroute_pickup", position: origin, bearing: 180, plate: "AA 1-C30003", selected: false },
      { id: "V4", tier: "cargo", status: "alert", position: origin, bearing: 270, plate: "AA 3-A40004", selected: false },
    ]);
    expect(fleet3d.features.length).toBeGreaterThanOrEqual(18);
    const pinParts = buildPin3dFeatures(origin, "#10B981", "#064E3B", "dropoff");
    expect(pinParts).toHaveLength(3);
    expect(pinParts[2]?.properties?.height).toBe(25);
  });

  it("clamps satellite zoom cleanly and builds 3D Addis Ababa buildings, park trees & landmarks", () => {
    expect(ESRI_WORLD_IMAGERY_TILES).toContain("World_Imagery/MapServer/tile/{z}/{y}/{x}");
    expect(SATELLITE_MAX_ZOOM).toBe(17);
    expect(MAP_MAX_ZOOM).toBeLessThanOrEqual(17.5);

    const addisScene = buildCity3dSceneGeoJson("addis", "en");
    expect(addisScene.buildings.features.length).toBeGreaterThan(30);
    expect(addisScene.trees.features.length).toBeGreaterThan(80);
    expect(addisScene.landmarks.features).toHaveLength(CITIES.addis.landmarks.length);

    for (const cityId of CITY_ORDER) {
      const scene = buildCity3dSceneGeoJson(cityId, "en");
      expect(scene.buildings.features.length).toBeGreaterThan(10);
      expect(scene.trees.features.length).toBeGreaterThan(20);
      expect(scene.landmarks.features).toHaveLength(CITIES[cityId].landmarks.length);
      for (const feat of scene.landmarks.features) {
        expect(feat.geometry.type).toBe("Point");
        expect(feat.properties?.label).toBeTruthy();
      }
    }

    const amharicScene = buildCity3dSceneGeoJson("addis", "am");
    const firstLabel = String(amharicScene.landmarks.features[0]?.properties?.label ?? "");
    expect(firstLabel).toMatch(/[\u1200-\u137F]/);
  });
});
