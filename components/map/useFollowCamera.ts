"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { PerfTier } from "@/components/map/usePerfTier";
import { useFleetStore } from "@/store/useFleetStore";

export interface UseFollowCameraOptions {
  map: MapLibreMap | null;
  mapReady: boolean;
  followVehicleId: string | null;
  is3d: boolean;
  perfTier: PerfTier;
}

/**
 * Smooth navigation-style follow camera (`easeTo` along heading at 1 Hz)
 * when tracking an assigned ride or inspected fleet unit. Yields immediately
 * if the user pans/zooms manually, and re-locks when selection changes.
 */
export function useFollowCamera({
  map,
  mapReady,
  followVehicleId,
  is3d,
  perfTier,
}: UseFollowCameraOptions): { resetManualOverride: () => void } {
  const userMovedRef = useRef(false);
  const lastTrackedIdRef = useRef<string | null>(null);
  const vehicles = useFleetStore((state) => state.vehicles);

  useEffect(() => {
    if (!map || !mapReady) return;

    const markManual = () => {
      userMovedRef.current = true;
    };

    map.on("dragstart", markManual);
    map.on("wheel", markManual);
    return () => {
      map.off("dragstart", markManual);
      map.off("wheel", markManual);
    };
  }, [map, mapReady]);

  useEffect(() => {
    if (!map || !mapReady || !followVehicleId) {
      lastTrackedIdRef.current = null;
      return;
    }

    const isNewTarget = lastTrackedIdRef.current !== followVehicleId;
    if (isNewTarget) {
      lastTrackedIdRef.current = followVehicleId;
      userMovedRef.current = false;
    }

    if (userMovedRef.current) return;

    const target = vehicles.find((v) => v.id === followVehicleId);
    if (!target) return;

    const targetPitch = is3d ? 58 : 0;
    const targetBearing = is3d && perfTier === "full" ? target.bearing : map.getBearing();

    if (isNewTarget) {
      map.flyTo({
        center: target.position,
        zoom: Math.max(map.getZoom(), 16.3),
        pitch: targetPitch,
        bearing: targetBearing,
        duration: 950,
        essential: true,
      });
    } else {
      map.easeTo({
        center: target.position,
        pitch: targetPitch,
        bearing: targetBearing,
        duration: perfTier === "lite" ? 400 : 900,
        easing: (t) => t,
      });
    }
  }, [map, mapReady, followVehicleId, vehicles, is3d, perfTier]);

  return {
    resetManualOverride: () => {
      userMovedRef.current = false;
    },
  };
}
