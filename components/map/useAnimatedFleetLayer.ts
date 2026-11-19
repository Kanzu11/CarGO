"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { FLEET_3D_SOURCE_ID, FLEET_POINTS_SOURCE_ID } from "@/components/map/mapLayers";
import {
  buildFleet3dFeatureCollection,
  buildFleetPointFeatureCollection,
  type InterpolatedVehicle,
} from "@/components/map/vehicleModels";
import { clamp, lerpAngleDeg, lerpLngLat } from "@/lib/geo";
import { getTelemetryFramesMap, useFleetStore } from "@/store/useFleetStore";
import type { LngLat } from "@/types/fleet";

export interface AnimatedVehicleSnapshot {
  position: LngLat;
  bearing: number;
}

export interface UseAnimatedFleetLayerOptions {
  map: MapLibreMap | null;
  mapReady: boolean;
  onLowFps: () => void;
}

/**
 * Drives 60fps vehicle interpolation over 1 Hz authoritative telemetry frames
 * inside `requestAnimationFrame`, updating MapLibre GeoJSON sources directly
 * with zero React state updates per frame.
 */
export function useAnimatedFleetLayer({
  map,
  mapReady,
  onLowFps,
}: UseAnimatedFleetLayerOptions): React.RefObject<Map<string, AnimatedVehicleSnapshot>> {
  const livePositionsRef = useRef<Map<string, AnimatedVehicleSnapshot>>(new Map());
  const onLowFpsRef = useRef(onLowFps);

  useEffect(() => {
    onLowFpsRef.current = onLowFps;
  }, [onLowFps]);

  useEffect(() => {
    if (!map || !mapReady) return;

    let rafId = 0;
    let lastTs = performance.now();
    let slowAccumMs = 0;
    let downgraded = false;

    const tick = (ts: number) => {
      const frameDelta = ts - lastTs;
      lastTs = ts;

      if (!document.hidden) {
        if (frameDelta > 34) {
          slowAccumMs += frameDelta;
          if (!downgraded && slowAccumMs >= 3000) {
            downgraded = true;
            onLowFpsRef.current();
          }
        } else {
          slowAccumMs = Math.max(0, slowAccumMs - frameDelta * 0.5);
        }

        const state = useFleetStore.getState();
        const frames = getTelemetryFramesMap();
        const now = Date.now();
        const tierFilter = state.tierFilter;

        const interpolated: InterpolatedVehicle[] = [];
        const liveMap = livePositionsRef.current;
        liveMap.clear();

        for (const v of state.vehicles) {
          if (tierFilter !== "all" && v.tier !== tierFilter) continue;

          const frame = frames.get(v.id);
          let pos = v.position;
          let bearing = v.bearing;
          let status = v.status;

          if (frame) {
            const span = Math.max(1, frame.t1 - frame.t0);
            const u = clamp((now - frame.t0) / span, 0, 1);
            pos = lerpLngLat(frame.from, frame.to, u);
            bearing = lerpAngleDeg(frame.fromBearing, frame.toBearing, u);
            status = frame.status;
          }

          liveMap.set(v.id, { position: pos, bearing });

          interpolated.push({
            id: v.id,
            tier: v.tier,
            status,
            position: pos,
            bearing,
            plate: v.plate,
            selected: state.selectedVehicleId === v.id,
            isPlayerDriver: v.isPlayerDriver,
          });
        }

        const pointsSource = map.getSource(FLEET_POINTS_SOURCE_ID) as GeoJSONSource | undefined;
        if (pointsSource) {
          pointsSource.setData(buildFleetPointFeatureCollection(interpolated));
        }

        if (state.map3dEnabled && map.getZoom() >= 14.1) {
          const polySource = map.getSource(FLEET_3D_SOURCE_ID) as GeoJSONSource | undefined;
          if (polySource) {
            polySource.setData(buildFleet3dFeatureCollection(interpolated));
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [map, mapReady]);

  return livePositionsRef;
}
