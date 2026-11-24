"use client";

import { useCallback, useEffect, useRef } from "react";
import { CITIES } from "@/lib/cities";
import { getStrings, localizeCityName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import { toast } from "@/store/useToastStore";

/**
 * Requests browser geolocation permission on mount, tracks the user's real GPS
 * position in parallel with the simulated fleet, and provides manual retry.
 */
export function useUserLocation(): { requestLocation: (manual?: boolean) => void } {
  const watchIdRef = useRef<number | null>(null);
  const promptedOnceRef = useRef(false);

  const requestLocation = useCallback((manual = false) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      useFleetStore.getState().setGeoStatus("unavailable");
      if (manual) {
        const locale = useFleetStore.getState().locale;
        toast(getStrings(locale).gpsUnavailable, { tone: "warn" });
      }
      return;
    }

    useFleetStore.getState().setGeoStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        const state = useFleetStore.getState();
        state.applyRealLocation(coords, pos.coords.accuracy, true, manual);
        const updated = useFleetStore.getState().userGeo;
        if (updated) {
          const cityName = localizeCityName(updated.nearestCityId, state.locale);
          if (manual || updated.isWithinCity) {
            toast(
              updated.isWithinCity
                ? `${cityName} • ${getStrings(state.locale).liveGpsBadge} (±${updated.accuracyM}m)`
                : `${getStrings(state.locale).liveGpsBadge} (±${updated.accuracyM}m)`,
              {
                description: updated.isWithinCity
                  ? CITIES[updated.nearestCityId].region
                  : undefined,
                tone: "live",
              },
            );
          }
        }
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        useFleetStore.getState().setGeoStatus(denied ? "denied" : "unavailable");
        if (manual) {
          const s = getStrings(useFleetStore.getState().locale);
          toast(denied ? s.gpsDenied : s.gpsUnavailable, { tone: "warn" });
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    );

    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          useFleetStore.getState().applyRealLocation(coords, pos.coords.accuracy, false);
        },
        () => {
          // Keep last known position or simulation mode silently
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    }
  }, []);

  useEffect(() => {
    if (!promptedOnceRef.current) {
      promptedOnceRef.current = true;
      const timer = window.setTimeout(() => requestLocation(false), 250);
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [requestLocation]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return { requestLocation };
}
