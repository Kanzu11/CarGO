"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  setWorkerUrl,
  type ErrorEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapControls } from "@/components/map/MapControls";
import { PickupCrosshair } from "@/components/map/PickupCrosshair";
import {
  apply3dBuildingsLayer,
  applyCameraMode,
  applyFlatSkyAndLight,
  applyMapLanguage,
  applySatelliteHybridTheme,
  applyTerrainAndHillshade,
  CAMERA_PRESETS,
  CARTO_POSITRON_STYLE,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  OPENFREEMAP_POSITRON_STYLE,
  rewriteCartoGlyphUrl,
  setBuildingsVisibility,
  TERRAIN_SOURCE_ID,
} from "@/components/map/map3d";
import {
  ensureCargoLayers,
  FLEET_SPRITES_LAYER_ID,
  syncFleetLayerMode,
  updateCityEnvironmentLayers,
  updateRoutesAndPins,
  updateUserLocationLayer,
} from "@/components/map/mapLayers";
import { useAnimatedFleetLayer } from "@/components/map/useAnimatedFleetLayer";
import { useFollowCamera } from "@/components/map/useFollowCamera";
import { usePerfTier } from "@/components/map/usePerfTier";
import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/cities";
import { getStrings, localizeCityName } from "@/lib/i18n";
import { isActiveTripPhase } from "@/lib/tripMachine";
import { useFleetStore } from "@/store/useFleetStore";
import type { LngLat } from "@/types/fleet";

export interface MapPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface MapCanvasProps {
  variant: "mobile" | "dispatch";
  showCrosshair?: boolean;
  showAllTrips?: boolean;
  followVehicleId?: string | null;
  previewRoute?: ReadonlyArray<LngLat>;
  fitBoundsCoords?: ReadonlyArray<LngLat> | null;
  fitBoundsKey?: string;
  padding?: MapPadding;
  onMapClick?: (coords: LngLat) => void;
  onVehicleClick?: (vehicleId: string) => void;
  onCrosshairSettled?: (coords: LngLat) => void;
  controlsClassName?: string;
  className?: string;
}

export default function MapCanvas({
  variant,
  showCrosshair = false,
  showAllTrips = false,
  followVehicleId = null,
  previewRoute,
  fitBoundsCoords,
  fitBoundsKey,
  padding,
  onMapClick,
  onVehicleClick,
  onCrosshairSettled,
  controlsClassName,
  className,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const cityId = useFleetStore((s) => s.cityId);
  const locale = useFleetStore((s) => s.locale);
  const locationSource = useFleetStore((s) => s.locationSource);
  const userGeo = useFleetStore((s) => s.userGeo);
  const map3dEnabled = useFleetStore((s) => s.map3dEnabled);
  const setMap3dEnabled = useFleetStore((s) => s.setMap3dEnabled);
  const trips = useFleetStore((s) => s.trips);
  const activeRiderTripId = useFleetStore((s) => s.activeRiderTripId);
  const activeDriverTripId = useFleetStore((s) => s.activeDriverTripId);
  const pickup = useFleetStore((s) => s.pickup);
  const destination = useFleetStore((s) => s.destination);
  const mode = useFleetStore((s) => s.mode);
  const riderStep = useFleetStore((s) => s.riderStep);

  const { perfTier, downgradeToLite } = usePerfTier();
  const [terrainBlocked, setTerrainBlocked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bearing, setBearing] = useState(() => CITIES[cityId].bearing);
  const [centerCoords, setCenterCoords] = useState<LngLat>(() => CITIES[cityId].center);

  // Refs for latest callbacks & values inside MapLibre event listeners
  const latestRef = useRef({
    map3dEnabled,
    perfTier,
    terrainBlocked,
    locale,
    showCrosshair,
    onMapClick,
    onVehicleClick,
    onCrosshairSettled,
  });

  useEffect(() => {
    latestRef.current = {
      map3dEnabled,
      perfTier,
      terrainBlocked,
      locale,
      showCrosshair,
      onMapClick,
      onVehicleClick,
      onCrosshairSettled,
    };
  });

  const lastCityRef = useRef(cityId);

  // Initialize MapLibre once on client mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialCity = CITIES[useFleetStore.getState().cityId];
    const initial3d = useFleetStore.getState().map3dEnabled;
    const preset =
      variant === "dispatch"
        ? CAMERA_PRESETS["dispatch-overview"]
        : CAMERA_PRESETS["rider-pickup"];

    setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);

    const map = new MapLibreMap({
      container,
      style: OPENFREEMAP_POSITRON_STYLE,
      center: initialCity.center,
      zoom: Math.min(
        16.5,
        variant === "dispatch" ? initialCity.zoom - 0.5 : initialCity.zoom + 0.5,
      ),
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      pitch: initial3d ? preset.pitch : 0,
      bearing: initial3d ? initialCity.bearing : 0,
      maxPitch: 68,
      attributionControl: false,
      transformRequest: (url, resourceType) => ({
        url: resourceType === "Glyphs" ? rewriteCartoGlyphUrl(url) : url,
      }),
    });

    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");

    let loadedOnce = false;
    let fallbackUsed = false;

    const fallbackTimer = window.setTimeout(() => {
      if (!loadedOnce && !fallbackUsed) {
        fallbackUsed = true;
        map.setStyle(CARTO_POSITRON_STYLE);
      }
    }, 9000);

    const setupStyle = () => {
      const {
        map3dEnabled: is3d,
        perfTier: tier,
        terrainBlocked: blocked,
        locale: currentLocale,
      } = latestRef.current;
      applySatelliteHybridTheme(map);
      apply3dBuildingsLayer(map, is3d);
      applyFlatSkyAndLight(map, is3d);
      applyTerrainAndHillshade(map, is3d && tier === "full" && !blocked);
      ensureCargoLayers(map, is3d);
      applyMapLanguage(map, currentLocale);
      updateCityEnvironmentLayers(map, useFleetStore.getState().cityId, currentLocale);
      updateUserLocationLayer(map, useFleetStore.getState().userGeo);
      setMapInstance(map);
      setMapReady(true);
    };

    map.on("style.load", setupStyle);
    map.on("load", () => {
      loadedOnce = true;
      window.clearTimeout(fallbackTimer);
      setupStyle();
    });

    map.on("error", (event: ErrorEvent) => {
      const errSource = (event as ErrorEvent & { sourceId?: string }).sourceId;
      const msg = event.error?.message ?? "";
      if (errSource === TERRAIN_SOURCE_ID || msg.includes("elevation-tiles-prod")) {
        applyTerrainAndHillshade(map, false);
        setTerrainBlocked(true);
        return;
      }
      if (
        !loadedOnce &&
        !fallbackUsed &&
        !msg.includes("elevation-tiles-prod") &&
        !msg.includes("Worker")
      ) {
        fallbackUsed = true;
        window.clearTimeout(fallbackTimer);
        map.setStyle(CARTO_POSITRON_STYLE);
      }
    });

    map.on("movestart", () => {
      setIsDragging(true);
    });

    map.on("move", () => {
      const c = map.getCenter();
      setCenterCoords([c.lng, c.lat]);
      setBearing(map.getBearing());
    });

    map.on("moveend", () => {
      setIsDragging(false);
      const c = map.getCenter();
      const coords: LngLat = [Number(c.lng.toFixed(6)), Number(c.lat.toFixed(6))];
      setCenterCoords(coords);
      setBearing(map.getBearing());
      if (latestRef.current.showCrosshair) {
        latestRef.current.onCrosshairSettled?.(coords);
      }
    });

    map.on("click", (event: MapMouseEvent) => {
      if (map.getLayer(FLEET_SPRITES_LAYER_ID)) {
        const hit = map.queryRenderedFeatures(event.point, {
          layers: [FLEET_SPRITES_LAYER_ID],
        })[0];
        const vehicleId = hit?.properties?.id as string | undefined;
        if (vehicleId) {
          latestRef.current.onVehicleClick?.(vehicleId);
          return;
        }
      }
      latestRef.current.onMapClick?.([
        Number(event.lngLat.lng.toFixed(6)),
        Number(event.lngLat.lat.toFixed(6)),
      ]);
    });

    map.on("mousemove", (event: MapMouseEvent) => {
      if (!map.getLayer(FLEET_SPRITES_LAYER_ID)) return;
      const hits = map.queryRenderedFeatures(event.point, {
        layers: [FLEET_SPRITES_LAYER_ID],
      });
      map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      window.clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [variant]);

  // Keep 60fps interpolated vehicle layer running while mounted
  useAnimatedFleetLayer({
    map: mapInstance,
    mapReady,
    onLowFps: downgradeToLite,
  });

  // Follow vehicle camera when tracking a ride or inspected dispatch unit
  const { resetManualOverride } = useFollowCamera({
    map: mapInstance,
    mapReady,
    followVehicleId,
    is3d: map3dEnabled,
    perfTier,
  });

  // Sync 2D/3D mode & perfTier updates dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const city = CITIES[cityId];
    const preset =
      variant === "dispatch"
        ? CAMERA_PRESETS["dispatch-overview"]
        : CAMERA_PRESETS["rider-pickup"];

    setBuildingsVisibility(map, map3dEnabled);
    applyFlatSkyAndLight(map, map3dEnabled);
    applyTerrainAndHillshade(map, map3dEnabled && perfTier === "full" && !terrainBlocked);
    syncFleetLayerMode(map, map3dEnabled);
    applyCameraMode(map, map3dEnabled, preset.pitch, city.bearing);
  }, [mapReady, map3dEnabled, perfTier, terrainBlocked, cityId, variant]);

  // Sync basemap labels to active English / Amharic locale
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyMapLanguage(map, locale);
  }, [mapReady, locale]);

  // Sync procedural 3D trees, parks & landmark dots when city or locale changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    updateCityEnvironmentLayers(map, cityId, locale);
  }, [mapReady, cityId, locale]);

  // Sync live user GPS accuracy ring & dot + fly to exact GPS when switching into Real GPS mode
  const lastGpsCenteredSourceRef = useRef(locationSource);
  const centeredFirstGpsRef = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    updateUserLocationLayer(map, userGeo);

    const switchedToReal =
      locationSource === "real" && lastGpsCenteredSourceRef.current !== "real";
    lastGpsCenteredSourceRef.current = locationSource;

    if (variant === "mobile" && locationSource === "real" && userGeo) {
      if (switchedToReal || !centeredFirstGpsRef.current) {
        centeredFirstGpsRef.current = true;
        map.flyTo({
          center: userGeo.coords,
          zoom: 16.4,
          pitch: map3dEnabled ? CAMERA_PRESETS["rider-pickup"].pitch : 0,
          bearing: map3dEnabled ? CITIES[cityId].bearing : 0,
          duration: 900,
          essential: true,
        });
      }
    }
  }, [mapReady, userGeo, locationSource, variant, map3dEnabled, cityId]);

  // Sync city switches smoothly via flyTo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || lastCityRef.current === cityId) return;
    lastCityRef.current = cityId;
    const city = CITIES[cityId];
    const preset =
      variant === "dispatch"
        ? CAMERA_PRESETS["dispatch-overview"]
        : CAMERA_PRESETS["rider-pickup"];

    const useGpsCenter =
      variant === "mobile" &&
      locationSource === "real" &&
      userGeo?.isWithinCity &&
      userGeo.nearestCityId === cityId;

    map.flyTo({
      center: useGpsCenter ? userGeo.coords : city.center,
      zoom: useGpsCenter
        ? 16.4
        : Math.min(16.5, variant === "dispatch" ? city.zoom - 0.5 : city.zoom + 0.5),
      pitch: map3dEnabled ? preset.pitch : 0,
      bearing: map3dEnabled ? city.bearing : 0,
      duration: 1100,
      essential: true,
    });
  }, [cityId, mapReady, map3dEnabled, variant, locationSource, userGeo]);

  // Sync MapLibre padding so optical center respects sheets/drawers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setPadding({
      top: padding?.top ?? 0,
      right: padding?.right ?? 0,
      bottom: padding?.bottom ?? 0,
      left: padding?.left ?? 0,
    });
  }, [mapReady, padding?.top, padding?.right, padding?.bottom, padding?.left]);

  const lastFitKeyRef = useRef<string | undefined>(undefined);
  const fitDataRef = useRef({ fitBoundsCoords, padding, map3dEnabled });
  useEffect(() => {
    fitDataRef.current = { fitBoundsCoords, padding, map3dEnabled };
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !fitBoundsKey || lastFitKeyRef.current === fitBoundsKey) return;
    const coords = fitDataRef.current.fitBoundsCoords;
    if (!coords || coords.length < 2) return;
    lastFitKeyRef.current = fitBoundsKey;

    const bounds = new LngLatBounds(coords[0]!, coords[0]!);
    for (const pt of coords) {
      bounds.extend(pt);
    }

    const pad = fitDataRef.current.padding;
    const width = containerRef.current?.clientWidth ?? 400;
    const height = containerRef.current?.clientHeight ?? 700;
    const rawLeft = (pad?.left ?? 0) + 32;
    const rawRight = (pad?.right ?? 0) + 32;
    const rawTop = (pad?.top ?? 0) + 32;
    const rawBottom = (pad?.bottom ?? 0) + 32;

    const maxHoriz = Math.max(40, width - 90);
    const maxVert = Math.max(40, height - 90);
    const horizScale = rawLeft + rawRight > maxHoriz ? maxHoriz / (rawLeft + rawRight) : 1;
    const vertScale = rawTop + rawBottom > maxVert ? maxVert / (rawTop + rawBottom) : 1;

    map.fitBounds(bounds, {
      padding: {
        top: Math.round(rawTop * vertScale),
        bottom: Math.round(rawBottom * vertScale),
        left: Math.round(rawLeft * horizScale),
        right: Math.round(rawRight * horizScale),
      },
      maxZoom: 15.8,
      pitch: fitDataRef.current.map3dEnabled ? 45 : 0,
      duration: 650,
    });
  }, [mapReady, fitBoundsKey]);

  // Sync route ribbons & 3D pickup/dropoff pins
  const visibleTrips = useMemo(() => {
    if (showAllTrips) {
      return trips.filter((t) => isActiveTripPhase(t.phase));
    }
    const targetTripId = mode === "driver" ? activeDriverTripId : activeRiderTripId;
    if (!targetTripId) return [];
    const found = trips.find((t) => t.id === targetTripId);
    return found && isActiveTripPhase(found.phase) ? [found] : [];
  }, [showAllTrips, trips, mode, activeDriverTripId, activeRiderTripId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const activeFocusTrip = visibleTrips[0];
    const showRiderSelectionPins = !showAllTrips && mode === "rider" && riderStep !== "location";

    const pickupPin = activeFocusTrip
      ? activeFocusTrip.pickup.coords
      : showRiderSelectionPins
        ? pickup.coords
        : null;
    const dropoffPin = activeFocusTrip
      ? activeFocusTrip.dropoff.coords
      : showRiderSelectionPins && destination
        ? destination.coords
        : null;

    updateRoutesAndPins(map, {
      trips: visibleTrips,
      previewRoute: visibleTrips.length === 0 ? previewRoute : undefined,
      pickupPin,
      dropoffPin,
    });
  }, [
    mapReady,
    visibleTrips,
    previewRoute,
    showAllTrips,
    mode,
    riderStep,
    pickup.coords,
    destination,
  ]);

  const handleToggle3d = useCallback(() => {
    setMap3dEnabled(!map3dEnabled);
  }, [map3dEnabled, setMap3dEnabled]);

  const handleResetNorth = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: 0, duration: 350 });
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    resetManualOverride();
    const city = CITIES[cityId];
    const preset =
      variant === "dispatch"
        ? CAMERA_PRESETS["dispatch-overview"]
        : CAMERA_PRESETS["rider-pickup"];

    if (followVehicleId) {
      const target = useFleetStore.getState().vehicles.find((v) => v.id === followVehicleId);
      if (target) {
        map.flyTo({
          center: target.position,
          zoom: 16.4,
          pitch: map3dEnabled ? 58 : 0,
          bearing: map3dEnabled ? target.bearing : 0,
          duration: 750,
        });
        return;
      }
    }

    if (variant === "mobile" && locationSource === "real" && userGeo) {
      map.flyTo({
        center: userGeo.coords,
        zoom: 16.4,
        pitch: map3dEnabled ? preset.pitch : 0,
        bearing: map3dEnabled ? city.bearing : 0,
        duration: 750,
      });
      return;
    }

    map.flyTo({
      center: city.center,
      zoom: variant === "dispatch" ? city.zoom - 0.5 : city.zoom + 0.5,
      pitch: map3dEnabled ? preset.pitch : 0,
      bearing: map3dEnabled ? city.bearing : 0,
      duration: 750,
    });
  }, [cityId, followVehicleId, locationSource, map3dEnabled, resetManualOverride, userGeo, variant]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 220 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 220 });
  }, []);

  const s = getStrings(locale);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-surface", className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label={`${localizeCityName(cityId, locale)} 3D`}
      />

      {!mapReady && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface"
        >
          <span className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-[12px] font-medium text-muted">
            {localizeCityName(cityId, locale)} · {s.loadingMap}
          </span>
        </div>
      )}

      {showCrosshair && (
        <PickupCrosshair
          centerCoords={centerCoords}
          isDragging={isDragging}
          padding={padding}
        />
      )}

      <div className={cn("pointer-events-none absolute right-3 top-16 z-20", controlsClassName)}>
        <MapControls
          is3d={map3dEnabled}
          bearing={bearing}
          perfTier={perfTier}
          onToggle3d={handleToggle3d}
          onRecenter={handleRecenter}
          onResetNorth={handleResetNorth}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>
    </div>
  );
}
