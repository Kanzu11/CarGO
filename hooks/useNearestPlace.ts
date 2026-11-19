"use client";

import { useMemo } from "react";
import { findNearestPlace } from "@/lib/cities";
import { getStrings, localizeLandmarkChip, localizePlaceName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { LandmarkChip, LngLat, Place } from "@/types/fleet";

export interface NearestPlaceResult {
  place: Place;
  distanceMeters: number;
  formattedLabel: string;
}

/**
 * Resolves the nearest Ethiopian landmark or neighborhood as the map crosshair moves,
 * localized to English or Amharic.
 */
export function useNearestPlace(coords: LngLat): NearestPlaceResult {
  const cityId = useFleetStore((state) => state.cityId);
  const locale = useFleetStore((state) => state.locale);

  return useMemo(() => {
    const { place, distanceMeters } = findNearestPlace(cityId, coords);
    const name = localizePlaceName(place, locale);
    const tag = localizeLandmarkChip(place.tag as LandmarkChip, locale);
    const s = getStrings(locale);
    const unit = locale === "am" ? "ሜ" : "m";
    const formattedLabel =
      distanceMeters <= 90
        ? `${name} · ${tag}`
        : `${s.nearPrefix} ${name} · ${distanceMeters}${unit}`;
    return {
      place,
      distanceMeters,
      formattedLabel,
    };
  }, [cityId, coords, locale]);
}
