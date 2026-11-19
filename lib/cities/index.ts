import { ADAMA_CITY } from "@/lib/cities/adama";
import { ADDIS_CITY } from "@/lib/cities/addis";
import { HAWASSA_CITY } from "@/lib/cities/hawassa";
import { WORABE_CITY } from "@/lib/cities/worabe";
import { haversineMeters } from "@/lib/geo";
import type { CityConfig, CityId, LngLat, Place } from "@/types/fleet";

export const CITY_ORDER: ReadonlyArray<CityId> = ["adama", "addis", "hawassa", "worabe"];

export const CITIES: Record<CityId, CityConfig> = {
  adama: ADAMA_CITY,
  addis: ADDIS_CITY,
  hawassa: HAWASSA_CITY,
  worabe: WORABE_CITY,
};

export const DEFAULT_CITY_ID: CityId = "adama";

export function getCityConfig(cityId: CityId): CityConfig {
  return CITIES[cityId];
}

export function getAllCityPlaces(cityId: CityId): Place[] {
  const city = CITIES[cityId];
  return [...city.landmarks, ...city.neighborhoods];
}

/**
 * Resolves the nearest landmark or neighborhood to an arbitrary coordinate,
 * plus the distance in meters (used by the pickup crosshair and vehicle tags).
 */
export function findNearestPlace(
  cityId: CityId,
  coords: LngLat,
): { place: Place; distanceMeters: number } {
  const places = getAllCityPlaces(cityId);
  let best = places[0]!;
  let bestDist = haversineMeters(coords, best.coords);

  for (let i = 1; i < places.length; i++) {
    const candidate = places[i]!;
    const dist = haversineMeters(coords, candidate.coords);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }

  return {
    place: best,
    distanceMeters: Math.round(bestDist),
  };
}
