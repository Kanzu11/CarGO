import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { BUILDINGS_3D_LAYER_ID, findFirstSymbolLayerId } from "@/components/map/map3d";
import { buildCityEnvironmentGeoJson } from "@/components/map/mapTrees";
import { buildPin3dPolygon, localMetersToLngLat } from "@/components/map/vehicleModels";
import { registerVehicleSprites } from "@/components/map/vehicleSprites";
import type { CityId, LngLat, Locale, Trip, UserGeoPosition } from "@/types/fleet";

export const ENV_PARKS_SOURCE_ID = "cargo-env-parks";
export const ENV_TREES_SOURCE_ID = "cargo-env-trees";
export const ENV_LANDMARKS_SOURCE_ID = "cargo-env-landmarks";
export const ROUTES_SOURCE_ID = "cargo-routes";
export const PINS_3D_SOURCE_ID = "cargo-pins-3d";
export const PINS_POINTS_SOURCE_ID = "cargo-pins-points";
export const FLEET_POINTS_SOURCE_ID = "cargo-fleet-points";
export const USER_ACCURACY_SOURCE_ID = "cargo-user-accuracy";
export const USER_DOT_SOURCE_ID = "cargo-user-dot";

export const ENV_PARKS_LAYER_ID = "cargo-env-parks-fill";
export const ENV_TREES_LAYER_ID = "cargo-env-trees-3d";
export const ENV_TREES_2D_LAYER_ID = "cargo-env-trees-2d";
export const ENV_LANDMARKS_LAYER_ID = "cargo-env-landmarks-dots";
export const ROUTE_APPROACH_LAYER_ID = "cargo-route-approach";
export const ROUTE_HALO_LAYER_ID = "cargo-route-halo";
export const ROUTE_CASING_LAYER_ID = "cargo-route-casing";
export const ROUTE_MAIN_LAYER_ID = "cargo-route-main";
export const FLEET_SPRITES_LAYER_ID = "cargo-fleet-sprites-layer";
export const USER_ACCURACY_LAYER_ID = "cargo-user-accuracy-layer";
export const USER_ACCURACY_BORDER_LAYER_ID = "cargo-user-accuracy-border";
export const USER_DOT_LAYER_ID = "cargo-user-dot-layer";
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

  ensureGeoJsonSource(map, ENV_PARKS_SOURCE_ID);
  ensureGeoJsonSource(map, ENV_TREES_SOURCE_ID);
  ensureGeoJsonSource(map, ENV_LANDMARKS_SOURCE_ID);
  ensureGeoJsonSource(map, ROUTES_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_3D_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_POINTS_SOURCE_ID);
  ensureGeoJsonSource(map, FLEET_POINTS_SOURCE_ID);
  ensureGeoJsonSource(map, USER_ACCURACY_SOURCE_ID);
  ensureGeoJsonSource(map, USER_DOT_SOURCE_ID);

  const beforeBuildingsOrLabel = map.getLayer(BUILDINGS_3D_LAYER_ID)
    ? BUILDINGS_3D_LAYER_ID
    : findFirstSymbolLayerId(map);
  const beforeSymbol = findFirstSymbolLayerId(map);

  if (!map.getLayer(ENV_PARKS_LAYER_ID)) {
    map.addLayer(
      {
        id: ENV_PARKS_LAYER_ID,
        type: "fill",
        source: ENV_PARKS_SOURCE_ID,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.78,
          "fill-outline-color": "#86EFAC",
        },
      },
      beforeBuildingsOrLabel,
    );
  }

  if (!map.getLayer(ENV_TREES_2D_LAYER_ID)) {
    map.addLayer(
      {
        id: ENV_TREES_2D_LAYER_ID,
        type: "fill",
        source: ENV_TREES_SOURCE_ID,
        minzoom: 13,
        filter: ["==", ["get", "kind"], "crown"],
        layout: {
          visibility: is3d ? "none" : "visible",
        },
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.65,
        },
      },
      beforeSymbol,
    );
  }

  if (!map.getLayer(ENV_TREES_LAYER_ID)) {
    map.addLayer(
      {
        id: ENV_TREES_LAYER_ID,
        type: "fill-extrusion",
        source: ENV_TREES_SOURCE_ID,
        minzoom: 12.5,
        layout: {
          visibility: is3d ? "visible" : "none",
        },
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "base"],
          "fill-extrusion-vertical-gradient": false,
          "fill-extrusion-opacity": 0.94,
        },
      },
      beforeSymbol,
    );
  }

  if (!map.getLayer(ENV_LANDMARKS_LAYER_ID)) {
    map.addLayer(
      {
        id: ENV_LANDMARKS_LAYER_ID,
        type: "circle",
        source: ENV_LANDMARKS_SOURCE_ID,
        minzoom: 12,
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#FFFFFF",
          "circle-stroke-color": "#047857",
          "circle-stroke-width": 2,
        },
      },
      beforeSymbol,
    );
  }

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

  if (!map.getLayer(USER_ACCURACY_LAYER_ID)) {
    map.addLayer({
      id: USER_ACCURACY_LAYER_ID,
      type: "fill",
      source: USER_ACCURACY_SOURCE_ID,
      paint: {
        "fill-color": "#047857",
        "fill-opacity": 0.12,
      },
    });
  }

  if (!map.getLayer(USER_ACCURACY_BORDER_LAYER_ID)) {
    map.addLayer({
      id: USER_ACCURACY_BORDER_LAYER_ID,
      type: "line",
      source: USER_ACCURACY_SOURCE_ID,
      paint: {
        "line-color": "#047857",
        "line-width": 1.2,
        "line-opacity": 0.45,
      },
    });
  }

  if (!map.getLayer(USER_DOT_LAYER_ID)) {
    map.addLayer({
      id: USER_DOT_LAYER_ID,
      type: "circle",
      source: USER_DOT_SOURCE_ID,
      paint: {
        "circle-radius": 6.5,
        "circle-color": "#047857",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#FFFFFF",
      },
    });
  }
}

export function syncFleetLayerMode(map: MapLibreMap, is3d: boolean): void {
  if (map.getLayer(PINS_3D_STEM_LAYER_ID)) {
    map.setLayoutProperty(PINS_3D_STEM_LAYER_ID, "visibility", is3d ? "visible" : "none");
  }
  if (map.getLayer(ENV_TREES_LAYER_ID)) {
    map.setLayoutProperty(ENV_TREES_LAYER_ID, "visibility", is3d ? "visible" : "none");
  }
  if (map.getLayer(ENV_TREES_2D_LAYER_ID)) {
    map.setLayoutProperty(ENV_TREES_2D_LAYER_ID, "visibility", is3d ? "none" : "visible");
  }
}

/** Populates lush green parks, 3D tree extrusions, and city landmark dots. */
export function updateCityEnvironmentLayers(
  map: MapLibreMap,
  cityId: CityId,
  locale: Locale,
): void {
  const parksSource = map.getSource(ENV_PARKS_SOURCE_ID) as GeoJSONSource | undefined;
  const treesSource = map.getSource(ENV_TREES_SOURCE_ID) as GeoJSONSource | undefined;
  const landmarksSource = map.getSource(ENV_LANDMARKS_SOURCE_ID) as GeoJSONSource | undefined;

  if (!parksSource && !treesSource && !landmarksSource) return;

  const env = buildCityEnvironmentGeoJson(cityId, locale);
  parksSource?.setData(env.parks);
  treesSource?.setData(env.trees);
  landmarksSource?.setData(env.landmarks);
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

/** Updates the live user GPS dot & accuracy ring polygon on the map. */
export function updateUserLocationLayer(
  map: MapLibreMap,
  userGeo: UserGeoPosition | null,
): void {
  const accuracySource = map.getSource(USER_ACCURACY_SOURCE_ID) as GeoJSONSource | undefined;
  const dotSource = map.getSource(USER_DOT_SOURCE_ID) as GeoJSONSource | undefined;
  if (!accuracySource || !dotSource) return;

  if (!userGeo) {
    accuracySource.setData(EMPTY_FC);
    dotSource.setData(EMPTY_FC);
    return;
  }

  const radiusM = Math.max(12, Math.min(220, userGeo.accuracyM));
  const ring: LngLat[] = [];
  const sides = 24;
  for (let i = 0; i < sides; i++) {
    ring.push(localMetersToLngLat(userGeo.coords, radiusM, 0, (i / sides) * 360));
  }
  ring.push(ring[0]!);

  accuracySource.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    ],
  });

  dotSource.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: userGeo.coords },
      },
    ],
  });
}
