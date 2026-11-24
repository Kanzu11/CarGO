import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { findFirstSymbolLayerId } from "@/components/map/map3d";
import { buildCityLandmarksGeoJson } from "@/components/map/mapTrees";
import {
  PIN_DROPOFF_SPRITE_ID,
  PIN_PERSON_SPRITE_ID,
  PIN_PICKUP_SPRITE_ID,
  registerPinSprites,
} from "@/components/map/pinSprites";
import {
  buildPin3dPolygon,
  localMetersToLngLat,
} from "@/components/map/vehicleModels";
import { haversineMeters } from "@/lib/geo";
import { registerVehicleSprites } from "@/components/map/vehicleSprites";
import type { CityId, LngLat, Locale, LocationSource, Trip, TripPhase, UserGeoPosition } from "@/types/fleet";

export const ENV_LANDMARKS_SOURCE_ID = "cargo-env-landmarks";
export const ROUTES_SOURCE_ID = "cargo-routes";
export const PINS_3D_SOURCE_ID = "cargo-pins-3d";
export const PINS_POINTS_SOURCE_ID = "cargo-pins-points";
export const FLEET_POINTS_SOURCE_ID = "cargo-fleet-points";
export const FLEET_3D_SOURCE_ID = "cargo-fleet-3d";
export const USER_ACCURACY_SOURCE_ID = "cargo-user-accuracy";
export const USER_DOT_SOURCE_ID = "cargo-user-dot";

export const ENV_LANDMARKS_LAYER_ID = "cargo-env-landmarks-dots";
export const ROUTE_APPROACH_LAYER_ID = "cargo-route-approach";
export const ROUTE_HALO_LAYER_ID = "cargo-route-halo";
export const ROUTE_CASING_LAYER_ID = "cargo-route-casing";
export const ROUTE_MAIN_LAYER_ID = "cargo-route-main";
export const FLEET_SPRITES_LAYER_ID = "cargo-fleet-sprites-layer";
export const FLEET_3D_LAYER_ID = "cargo-fleet-3d-layer";
export const USER_ACCURACY_LAYER_ID = "cargo-user-accuracy-layer";
export const USER_ACCURACY_BORDER_LAYER_ID = "cargo-user-accuracy-border";
export const USER_PULSE_LAYER_ID = "cargo-user-pulse";
export const USER_DOT_LAYER_ID = "cargo-user-dot-layer";
export const PINS_PULSE_LAYER_ID = "cargo-pins-pulse";
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
  registerPinSprites(map);

  ensureGeoJsonSource(map, ENV_LANDMARKS_SOURCE_ID);
  ensureGeoJsonSource(map, ROUTES_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_3D_SOURCE_ID);
  ensureGeoJsonSource(map, PINS_POINTS_SOURCE_ID);
  ensureGeoJsonSource(map, FLEET_POINTS_SOURCE_ID);
  ensureGeoJsonSource(map, FLEET_3D_SOURCE_ID);
  ensureGeoJsonSource(map, USER_ACCURACY_SOURCE_ID);
  ensureGeoJsonSource(map, USER_DOT_SOURCE_ID);

  const beforeSymbol = findFirstSymbolLayerId(map);

  if (!map.getLayer(ENV_LANDMARKS_LAYER_ID)) {
    map.addLayer(
      {
        id: ENV_LANDMARKS_LAYER_ID,
        type: "circle",
        source: ENV_LANDMARKS_SOURCE_ID,
        minzoom: 12,
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#10B981",
          "circle-stroke-color": "#FFFFFF",
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
        "line-color": "#F59E0B",
        "line-dasharray": [2, 2],
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2.5, 16, 4.2],
        "line-opacity": 0.95,
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
        "line-color": "#064E3B",
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
        "line-color": "#10B981",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3.8, 16, 6.2],
      },
    });
  }

  if (!map.getLayer(FLEET_3D_LAYER_ID)) {
    map.addLayer(
      {
        id: FLEET_3D_LAYER_ID,
        type: "fill-extrusion",
        source: FLEET_3D_SOURCE_ID,
        minzoom: 11.5,
        layout: {
          visibility: is3d ? "visible" : "none",
        },
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "base"],
          "fill-extrusion-vertical-gradient": true,
          "fill-extrusion-opacity": 0.96,
        },
      },
      beforeSymbol,
    );
  }

  if (!map.getLayer(FLEET_SPRITES_LAYER_ID)) {
    map.addLayer({
      id: FLEET_SPRITES_LAYER_ID,
      type: "symbol",
      source: FLEET_POINTS_SOURCE_ID,
      layout: {
        visibility: "visible",
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
          0.52,
          13,
          0.78,
          14.5,
          1.05,
          16,
          1.3,
          17.2,
          1.55,
        ],
      },
      paint: {
        "icon-opacity": 1,
      },
    });
  }

  if (!map.getLayer(PINS_PULSE_LAYER_ID)) {
    map.addLayer({
      id: PINS_PULSE_LAYER_ID,
      type: "circle",
      source: PINS_POINTS_SOURCE_ID,
      paint: {
        "circle-radius": 14,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.25,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.8,
        "circle-stroke-opacity": 0.7,
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
        "fill-extrusion-base": ["coalesce", ["get", "base"], 0],
        "fill-extrusion-vertical-gradient": true,
        "fill-extrusion-opacity": 0.92,
      },
    });
  }

  if (!map.getLayer(PINS_CAP_LAYER_ID)) {
    map.addLayer({
      id: PINS_CAP_LAYER_ID,
      type: "symbol",
      source: PINS_POINTS_SOURCE_ID,
      layout: {
        "icon-image": ["get", "spriteId"],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11,
          0.68,
          14,
          0.9,
          17.2,
          1.12,
        ],
      },
    });
  }

  if (!map.getLayer(USER_ACCURACY_LAYER_ID)) {
    map.addLayer({
      id: USER_ACCURACY_LAYER_ID,
      type: "fill",
      source: USER_ACCURACY_SOURCE_ID,
      paint: {
        "fill-color": "#0284C7",
        "fill-opacity": 0.14,
      },
    });
  }

  if (!map.getLayer(USER_ACCURACY_BORDER_LAYER_ID)) {
    map.addLayer({
      id: USER_ACCURACY_BORDER_LAYER_ID,
      type: "line",
      source: USER_ACCURACY_SOURCE_ID,
      paint: {
        "line-color": "#38BDF8",
        "line-width": 1.4,
        "line-opacity": 0.6,
      },
    });
  }

  if (!map.getLayer(USER_PULSE_LAYER_ID)) {
    map.addLayer({
      id: USER_PULSE_LAYER_ID,
      type: "circle",
      source: USER_DOT_SOURCE_ID,
      paint: {
        "circle-radius": 15,
        "circle-color": "#0284C7",
        "circle-opacity": 0.28,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.8,
      },
    });
  }

  if (!map.getLayer(USER_DOT_LAYER_ID)) {
    map.addLayer({
      id: USER_DOT_LAYER_ID,
      type: "symbol",
      source: USER_DOT_SOURCE_ID,
      layout: {
        "icon-image": PIN_PERSON_SPRITE_ID,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11,
          0.74,
          14,
          0.95,
          17.2,
          1.15,
        ],
      },
    });
  }
}

export function syncFleetLayerMode(map: MapLibreMap, is3d: boolean): void {
  if (map.getLayer(PINS_3D_STEM_LAYER_ID)) {
    map.setLayoutProperty(PINS_3D_STEM_LAYER_ID, "visibility", is3d ? "visible" : "none");
  }
  if (map.getLayer(FLEET_3D_LAYER_ID)) {
    map.setLayoutProperty(FLEET_3D_LAYER_ID, "visibility", is3d ? "visible" : "none");
  }
  if (map.getLayer(FLEET_SPRITES_LAYER_ID)) {
    map.setLayoutProperty(FLEET_SPRITES_LAYER_ID, "visibility", "visible");
  }
}

/** Populates localized city landmark anchor dots over the satellite map. */
export function updateCityEnvironmentLayers(
  map: MapLibreMap,
  cityId: CityId,
  locale: Locale,
): void {
  const landmarksSource = map.getSource(ENV_LANDMARKS_SOURCE_ID) as GeoJSONSource | undefined;
  if (!landmarksSource) return;
  landmarksSource.setData(buildCityLandmarksGeoJson(cityId, locale));
}

export interface PersonPinVisualState {
  pickupIsLiveGps: boolean;
  showAccuracyRing: boolean;
  showStandaloneUserPin: boolean;
}

/**
 * Resolves how the single Rider Person Pin and GPS accuracy ring should render
 * across `real` GPS and `simulated` modes so pins never duplicate or leave ghosts.
 */
export function resolvePersonPinState(params: {
  locationSource: LocationSource;
  userGeo: UserGeoPosition | null;
  pickupPin: LngLat | null;
  activeTripPhase?: TripPhase | null;
}): PersonPinVisualState {
  const { locationSource, userGeo, pickupPin } = params;
  if (locationSource !== "real" || !userGeo) {
    return {
      pickupIsLiveGps: false,
      showAccuracyRing: false,
      showStandaloneUserPin: false,
    };
  }
  if (!pickupPin) {
    return {
      pickupIsLiveGps: false,
      showAccuracyRing: true,
      showStandaloneUserPin: true,
    };
  }
  const syncedWithPickup = haversineMeters(pickupPin, userGeo.coords) <= 25;
  return {
    pickupIsLiveGps: syncedWithPickup,
    showAccuracyRing: true,
    showStandaloneUserPin: !syncedWithPickup,
  };
}

export interface RouteAndPinUpdate {
  trips: ReadonlyArray<Trip>;
  previewRoute?: ReadonlyArray<LngLat>;
  pickupPin?: LngLat | null;
  dropoffPin?: LngLat | null;
  pickupIsLiveGps?: boolean;
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
      const isLiveGps = Boolean(data.pickupIsLiveGps);
      stemFeatures.push(
        buildPin3dPolygon(data.pickupPin, 3.6, 2.2, isLiveGps ? "#0284C7" : "#09090B", "pickup"),
      );
      pointFeatures.push({
        type: "Feature",
        properties: {
          kind: "pickup",
          color: isLiveGps ? "#0284C7" : "#10B981",
          spriteId: isLiveGps ? PIN_PERSON_SPRITE_ID : PIN_PICKUP_SPRITE_ID,
        },
        geometry: { type: "Point", coordinates: data.pickupPin },
      });
    }

    if (data.dropoffPin) {
      stemFeatures.push(buildPin3dPolygon(data.dropoffPin, 3.6, 2.2, "#059669", "dropoff"));
      pointFeatures.push({
        type: "Feature",
        properties: {
          kind: "dropoff",
          color: "#10B981",
          spriteId: PIN_DROPOFF_SPRITE_ID,
        },
        geometry: { type: "Point", coordinates: data.dropoffPin },
      });
    }

    pins3dSource.setData({ type: "FeatureCollection", features: stemFeatures });
    pinsPointSource.setData({ type: "FeatureCollection", features: pointFeatures });
  }
}

export interface UserLocationLayerOptions {
  showAccuracyRing?: boolean;
  showStandalonePin?: boolean;
}

/** Updates the live user GPS pin & accuracy ring polygon on the map. */
export function updateUserLocationLayer(
  map: MapLibreMap,
  userGeo: UserGeoPosition | null,
  options?: UserLocationLayerOptions,
): void {
  const accuracySource = map.getSource(USER_ACCURACY_SOURCE_ID) as GeoJSONSource | undefined;
  const dotSource = map.getSource(USER_DOT_SOURCE_ID) as GeoJSONSource | undefined;
  if (!accuracySource || !dotSource) return;

  const showAccuracy = Boolean(userGeo) && (options?.showAccuracyRing ?? true);
  const showDot = Boolean(userGeo) && (options?.showStandalonePin ?? true);

  if (!showAccuracy || !userGeo) {
    accuracySource.setData(EMPTY_FC);
  } else {
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
  }

  if (!showDot || !userGeo) {
    dotSource.setData(EMPTY_FC);
  } else {
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
}
