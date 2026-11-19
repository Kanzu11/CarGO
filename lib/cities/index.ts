import { ADAMA_CITY } from "@/lib/cities/adama";
import { ADDIS_CITY } from "@/lib/cities/addis";
import { HAWASSA_CITY } from "@/lib/cities/hawassa";
import { WORABE_CITY } from "@/lib/cities/worabe";
import { haversineKm, haversineMeters } from "@/lib/geo";
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

const CITY_RADIUS_KM = 35;

/**
 * Finds the closest supported CarGo city to a real GPS coordinate and reports
 * whether the user is physically inside its 35 km regional dispatch perimeter.
 */
export function detectNearestSupportedCity(coords: LngLat): {
  cityId: CityId;
  distanceKm: number;
  isWithinCity: boolean;
} {
  let bestCity: CityId = DEFAULT_CITY_ID;
  let bestDistKm = Infinity;

  for (const id of CITY_ORDER) {
    const dist = haversineKm(coords, CITIES[id].center);
    if (dist < bestDistKm) {
      bestDistKm = dist;
      bestCity = id;
    }
  }

  return {
    cityId: bestCity,
    distanceKm: Number(bestDistKm.toFixed(1)),
    isWithinCity: bestDistKm <= CITY_RADIUS_KM,
  };
}
