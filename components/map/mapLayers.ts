import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { buildPin3dPolygon } from "@/components/map/vehicleModels";
import { registerVehicleSprites } from "@/components/map/vehicleSprites";
import type { LngLat, Trip } from "@/types/fleet";

export const ROUTES_SOURCE_ID = "cargo-routes";
export const PINS_3D_SOURCE_ID = "cargo-pins-3d";
export const PINS_POINTS_SOURCE_ID = "cargo-pins-points";
export const FLEET_POINTS_SOURCE_ID = "cargo-fleet-points";

export const ROUTE_APPROACH_LAYER_ID = "cargo-route-approach";
export const ROUTE_HALO_LAYER_ID = "cargo-route-halo";
export const ROUTE_CASING_LAYER_ID = "cargo-route-casing";
export const ROUTE_MAIN_LAYER_ID = "cargo-route-main";
export const FLEET_SPRITES_LAYER_ID = "cargo-fleet-sprites-layer";
export const PINS_3D_STEM_LAYER_ID = "cargo-pins-3d-stems";
export const PINS_CAP_LAYER_ID = "cargo-pins-caps";

const EMPTY_FC: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function ensureGeoJsonSource(map: MapLibreMap, id: string): void {
  if (map.getSource(id)) return;
  map.addSource(id, {
    type: "geojson",
    data: EMPTY_FC,
  });
}

/**
 * Installs all CarGo GeoJSON sources & layers (approach/trip routes with white
 * contrast halo, top-down tier-distinct vehicle sprites, and 3D pickup/dropoff stems).
 */
export function ensureCargoLayers(map: MapLibreMap, is3d: boolean): void {
  registerVehicleSprites(map);

  ensureGeoJsonSource(map, ROUTES_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_3D_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_POINTS_SOURCE_ID);
  ensureGeoJsonSource(map, FLEET_POINTS_SOURCE_ID);

  if (!map.getLayer(ROUTE_APPROACH_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_APPROACH_LAYER_ID,
      type: "line",
      source: ROUTES_SOURCE_ID,
      filter: ["==", ["get", "kind"], "approach"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#D97706",
        "line-dasharray": [2, 2],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 16, 4.2],
        "line-opacity": 0.92,
      },
    });
  }

  if (!map.getLayer(ROUTE_HALO_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_HALO_LAYER_ID,
      type: "line",
      source: ROUTES_SOURCE_ID,
      filter: ["==", ["get", "kind"], "trip"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#FFFFFF",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 8.5, 16, 12.5],
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_CASING_LAYER_ID,
      type: "line",
      source: ROUTES_SOURCE_ID,
      filter: ["==", ["get", "kind"], "trip"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#065F46",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 6, 16, 9],
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(ROUTE_MAIN_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_MAIN_LAYER_ID,
      type: "line",
      source: ROUTES_SOURCE_ID,
      filter: ["==", ["get", "kind"], "trip"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#047857",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3.8, 16, 6.2],
      },
    });
  }

  if (!map.getLayer(FLEET_SPRITES_LAYER_ID)) {
    map.addLayer({
      id: FLEET_SPRITES_LAYER_ID,
      type: "symbol",
      source: FLEET_POINTS_SOURCE_ID,
      layout: {
        "icon-image": ["get", "spriteKey"],
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          11,
          0.36,
          13,
          0.56,
          14.5,
          0.82,
          16,
          1.08,
          17.5,
          1.38,
        ],
      },
      paint: {
        "icon-opacity": 1,
      },
    });
  }

  if (!map.getLayer(PINS_3D_STEM_LAYER_ID)) {
    map.addLayer({
      id: PINS_3D_STEM_LAYER_ID,
      type: "fill-extrusion",
      source: PINS_3D_SOURCE_ID,
      layout: {
        visibility: is3d ? "visible" : "none",
      },
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": 0,
        "fill-extrusion-vertical-gradient": false,
        "fill-extrusion-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer(PINS_CAP_LAYER_ID)) {
    map.addLayer({
      id: PINS_CAP_LAYER_ID,
      type: "circle",
      source: PINS_POINTS_SOURCE_ID,
      paint: {
        "circle-radius": 6.5,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#FFFFFF",
      },
    });
  }
}

export function syncFleetLayerMode(map: MapLibreMap, is3d: boolean): void {
  if (map.getLayer(PINS_3D_STEM_LAYER_ID)) {
    map.setLayoutProperty(PINS_3D_STEM_LAYER_ID, "visibility", is3d ? "visible" : "none");
  }
}

export interface RouteAndPinUpdate {
  trips: ReadonlyArray<Trip>;
  previewRoute?: ReadonlyArray<LngLat>;
  pickupPin?: LngLat | null;
  dropoffPin?: LngLat | null;
}

export function updateRoutesAndPins(map: MapLibreMap, data: RouteAndPinUpdate): void {
  const routesSource = map.getSource(ROUTES_SOURCE_ID) as GeoJSONSource | undefined;
  const pins3dSource = map.getSource(PINS_3D_SOURCE_ID) as GeoJSONSource | undefined;
  const pinsPointSource = map.getSource(PINS_POINTS_SOURCE_ID) as GeoJSONSource | undefined;

  if (routesSource) {
    const routeFeatures: Feature<LineString>[] = [];

    for (const trip of data.trips) {
      if (
        (trip.phase === "DRIVER_ASSIGNED" || trip.phase === "ARRIVING") &&
        trip.approachRoute &&
        trip.approachRoute.length >= 2
      ) {
        routeFeatures.push({
          type: "Feature",
          properties: { kind: "approach", tripId: trip.id },
          geometry: { type: "LineString", coordinates: trip.approachRoute },
        });
      }
      if (trip.route.length >= 2) {
        routeFeatures.push({
          type: "Feature",
          properties: { kind: "trip", tripId: trip.id },
          geometry: { type: "LineString", coordinates: trip.route },
        });
      }
    }

    if (data.previewRoute && data.previewRoute.length >= 2) {
      routeFeatures.push({
        type: "Feature",
        properties: { kind: "trip", tripId: "preview" },
        geometry: { type: "LineString", coordinates: [...data.previewRoute] },
      });
    }

    routesSource.setData({
      type: "FeatureCollection",
      features: routeFeatures,
    });
  }

  if (pins3dSource && pinsPointSource) {
    const stemFeatures: Feature<Polygon>[] = [];
    const pointFeatures: Feature<Point>[] = [];

    if (data.pickupPin) {
      stemFeatures.push(buildPin3dPolygon(data.pickupPin, 2.2, 22, "#09090B", "pickup"));
      pointFeatures.push({
        type: "Feature",
        properties: { kind: "pickup", color: "#09090B" },
        geometry: { type: "Point", coordinates: data.pickupPin },
      });
    }

    if (data.dropoffPin) {
      stemFeatures.push(buildPin3dPolygon(data.dropoffPin, 2.4, 26, "#047857", "dropoff"));
      pointFeatures.push({
        type: "Feature",
        properties: { kind: "dropoff", color: "#047857" },
        geometry: { type: "Point", coordinates: data.dropoffPin },
      });
    }

    pins3dSource.setData({ type: "FeatureCollection", features: stemFeatures });
    pinsPointSource.setData({ type: "FeatureCollection", features: pointFeatures });
  }
}
