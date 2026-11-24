import { haversineKm } from "@/lib/geo";
import { computeCityRoute } from "@/lib/routing";
import type { CityId, LngLat } from "@/types/fleet";

export const OSRM_ROUTE_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const MAX_CACHE_ENTRIES = 200;
const OSRM_TIMEOUT_MS = 5000;

export interface RealRoadRoute {
  coords: LngLat[];
  distanceKm: number;
  durationMin: number;
  isRealRoad: boolean;
}

const routeCache = new Map<string, RealRoadRoute>();
const inFlightRequests = new Map<string, Promise<RealRoadRoute>>();

function routeCacheKey(origin: LngLat, destination: LngLat): string {
  return `${origin[0].toFixed(4)},${origin[1].toFixed(4)}->${destination[0].toFixed(4)},${destination[1].toFixed(4)}`;
}

function buildFallbackRoute(
  cityId: CityId,
  origin: LngLat,
  destination: LngLat,
): RealRoadRoute {
  const res = computeCityRoute(cityId, origin, destination);
  return {
    coords: res.coords,
    distanceKm: res.distanceKm,
    durationMin: Math.max(1, Math.round(res.distanceKm * 2.5)),
    isRealRoad: false,
  };
}

function setCachedRoute(key: string, route: RealRoadRoute): void {
  if (routeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = routeCache.keys().next().value;
    if (oldestKey) {
      routeCache.delete(oldestKey);
    }
  }
  routeCache.set(key, route);
}

/** Formats an OSRM public driving directions URL returning full GeoJSON road geometry. */
export function buildOsrmRouteUrl(origin: LngLat, destination: LngLat): string {
  return `${OSRM_ROUTE_BASE_URL}/${origin[0].toFixed(6)},${origin[1].toFixed(6)};${destination[0].toFixed(6)},${destination[1].toFixed(6)}?overview=full&geometries=geojson&steps=false`;
}

/** Synchronous cache lookup for real turn-by-turn OSRM road geometry. */
export function getCachedRoadRoute(origin: LngLat, destination: LngLat): RealRoadRoute | null {
  return routeCache.get(routeCacheKey(origin, destination)) ?? null;
}

interface OsrmApiResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  }>;
}

/**
 * Fetches a real street-following OpenStreetMap driving route via OSRM with
 * request deduplication, LRU caching, and instant fallback to `computeCityRoute`.
 */
export async function fetchRoadRoute(
  cityId: CityId,
  origin: LngLat,
  destination: LngLat,
): Promise<RealRoadRoute> {
  const key = routeCacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached) return cached;

  if (typeof window === "undefined" || haversineKm(origin, destination) < 0.02) {
    return buildFallbackRoute(cityId, origin, destination);
  }

  const pending = inFlightRequests.get(key);
  if (pending) return pending;

  const task = (async (): Promise<RealRoadRoute> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

    try {
      const res = await fetch(buildOsrmRouteUrl(origin, destination), {
        signal: controller.signal,
      });
      if (!res.ok) {
        return buildFallbackRoute(cityId, origin, destination);
      }

      const data = (await res.json()) as OsrmApiResponse;
      const first = data.routes?.[0];
      const rawCoords = first?.geometry?.coordinates;
      if (!first || !Array.isArray(rawCoords) || rawCoords.length < 2) {
        return buildFallbackRoute(cityId, origin, destination);
      }

      const coords: LngLat[] = [];
      for (const pt of rawCoords) {
        if (
          Array.isArray(pt) &&
          pt.length >= 2 &&
          typeof pt[0] === "number" &&
          typeof pt[1] === "number"
        ) {
          coords.push([pt[0], pt[1]]);
        }
      }
      if (coords.length < 2) {
        return buildFallbackRoute(cityId, origin, destination);
      }

      // Snap exact start & end pins so route ribbons terminate cleanly at the pins
      coords[0] = origin;
      coords[coords.length - 1] = destination;

      const distanceKm = Number(Math.max(0.25, (first.distance ?? 500) / 1000).toFixed(2));
      const durationMin = Math.max(1, Math.round((first.duration ?? 60) / 60));

      const roadRoute: RealRoadRoute = {
        coords,
        distanceKm,
        durationMin,
        isRealRoad: true,
      };
      setCachedRoute(key, roadRoute);
      return roadRoute;
    } catch {
      return buildFallbackRoute(cityId, origin, destination);
    } finally {
      window.clearTimeout(timer);
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, task);
  return task;
}
