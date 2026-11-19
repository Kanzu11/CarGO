"use client";

import { useMemo } from "react";
import { findNearestPlace } from "@/lib/cities";
import { useFleetStore } from "@/store/useFleetStore";
import type { LngLat, Place } from "@/types/fleet";

export interface NearestPlaceResult {
  place: Place;
  distanceMeters: number;
  formattedLabel: string;
}

/**
 * Resolves the nearest Ethiopian landmark or neighborhood as the map crosshair moves.
 */
export function useNearestPlace(coords: LngLat): NearestPlaceResult {
  const cityId = useFleetStore((state) => state.cityId);

  return useMemo(() => {
    const { place, distanceMeters } = findNearestPlace(cityId, coords);
    const formattedLabel =
      distanceMeters <= 90
        ? `${place.name} · ${place.tag}`
        : `Near ${place.name} · ${distanceMeters}m`;
    return {
      place,
      distanceMeters,
      formattedLabel,
    };
  }, [cityId, coords]);
}
