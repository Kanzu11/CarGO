"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRoadRoute, getCachedRoadRoute, type RealRoadRoute } from "@/lib/roadRouting";
import { computeCityRoute } from "@/lib/routing";
import type { CityId, LngLat } from "@/types/fleet";

/**
 * Reactively resolves a real street-following OpenStreetMap road route via OSRM,
 * seeding synchronously from cache or `computeCityRoute` fallback to avoid flicker.
 */
export function useRoadRoute(
  cityId: CityId,
  origin: LngLat | null,
  destination: LngLat | null,
): RealRoadRoute | null {
  const [resolved, setResolved] = useState<{ key: string; route: RealRoadRoute } | null>(null);

  const originLng = origin?.[0];
  const originLat = origin?.[1];
  const destLng = destination?.[0];
  const destLat = destination?.[1];

  const routeKey =
    originLng !== undefined &&
    originLat !== undefined &&
    destLng !== undefined &&
    destLat !== undefined
      ? `${cityId}:${originLng.toFixed(4)},${originLat.toFixed(4)}->${destLng.toFixed(4)},${destLat.toFixed(4)}`
      : null;

  useEffect(() => {
    if (
      !routeKey ||
      originLng === undefined ||
      originLat === undefined ||
      destLng === undefined ||
      destLat === undefined
    ) {
      return;
    }
    let cancelled = false;
    fetchRoadRoute(cityId, [originLng, originLat], [destLng, destLat]).then((route) => {
      if (!cancelled && route.isRealRoad) {
        setResolved({ key: routeKey, route });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routeKey, cityId, originLng, originLat, destLng, destLat]);

  return useMemo(() => {
    if (
      !routeKey ||
      originLng === undefined ||
      originLat === undefined ||
      destLng === undefined ||
      destLat === undefined
    ) {
      return null;
    }

    if (resolved && resolved.key === routeKey && resolved.route.isRealRoad) {
      return resolved.route;
    }

    const from: LngLat = [originLng, originLat];
    const to: LngLat = [destLng, destLat];
    const cached = getCachedRoadRoute(from, to);
    if (cached) return cached;

    const fallback = computeCityRoute(cityId, from, to);
    return {
      coords: fallback.coords,
      distanceKm: fallback.distanceKm,
      durationMin: Math.max(1, Math.round(fallback.distanceKm * 2.5)),
      isRealRoad: false,
    };
  }, [routeKey, resolved, cityId, originLng, originLat, destLng, destLat]);
}
