"use client";

import { MapPin, X } from "lucide-react";
import { useMemo } from "react";
import { DriverPanel } from "@/components/driver/DriverPanel";
import { ClientMap } from "@/components/map/ClientMap";
import { TopBar } from "@/components/mobile/TopBar";
import { RiderSheet } from "@/components/rider/RiderSheet";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Icon } from "@/components/ui/Icon";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getStrings } from "@/lib/i18n";
import { computeCityRoute } from "@/lib/routing";
import { isActiveTripPhase } from "@/lib/tripMachine";
import { useFleetStore } from "@/store/useFleetStore";
import type { LngLat } from "@/types/fleet";

/**
 * Full-screen (`100dvh`) mobile-first Rider & Driver shell for `/`.
 * Requests real browser geolocation permission while preserving simulated fallback.
 */
export function MobileShell() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { requestLocation } = useUserLocation();

  const cityId = useFleetStore((s) => s.cityId);
  const locale = useFleetStore((s) => s.locale);
  const mode = useFleetStore((s) => s.mode);
  const riderStep = useFleetStore((s) => s.riderStep);
  const pickup = useFleetStore((s) => s.pickup);
  const destination = useFleetStore((s) => s.destination);
  const pickingTarget = useFleetStore((s) => s.pickingTarget);
  const setPickingTarget = useFleetStore((s) => s.setPickingTarget);
  const setPickupFromCoords = useFleetStore((s) => s.setPickupFromCoords);
  const setDestinationFromCoords = useFleetStore((s) => s.setDestinationFromCoords);
  const trips = useFleetStore((s) => s.trips);
  const activeRiderTripId = useFleetStore((s) => s.activeRiderTripId);
  const activeDriverTripId = useFleetStore((s) => s.activeDriverTripId);
  const driverOnline = useFleetStore((s) => s.driverOnline);
  const driverOffer = useFleetStore((s) => s.driverOffer);
  const vehicles = useFleetStore((s) => s.vehicles);

  const s = getStrings(locale);

  const activeRiderTrip = useMemo(
    () => (activeRiderTripId ? trips.find((t) => t.id === activeRiderTripId) : undefined),
    [trips, activeRiderTripId],
  );

  const activeDriverTrip = useMemo(
    () => (activeDriverTripId ? trips.find((t) => t.id === activeDriverTripId) : undefined),
    [trips, activeDriverTripId],
  );

  const playerVehicle = useMemo(
    () => vehicles.find((v) => v.isPlayerDriver) ?? vehicles[0],
    [vehicles],
  );

  const showCrosshair =
    mode === "rider" && riderStep === "location" && pickingTarget === "pickup";

  const pickingDestinationOnMap =
    mode === "rider" && riderStep === "location" && pickingTarget === "destination";

  const previewRoute = useMemo(() => {
    if (mode === "rider") {
      if (riderStep === "trip" && activeRiderTrip && isActiveTripPhase(activeRiderTrip.phase)) {
        return undefined;
      }
      if (!destination) return undefined;
      return computeCityRoute(cityId, pickup.coords, destination.coords).coords;
    }
    if (driverOffer && !activeDriverTrip) {
      return driverOffer.route;
    }
    return undefined;
  }, [mode, riderStep, activeRiderTrip, destination, cityId, pickup.coords, driverOffer, activeDriverTrip]);

  const followVehicleId = useMemo(() => {
    if (mode === "rider") {
      if (
        activeRiderTrip &&
        (activeRiderTrip.phase === "DRIVER_ASSIGNED" ||
          activeRiderTrip.phase === "ARRIVING" ||
          activeRiderTrip.phase === "IN_PROGRESS")
      ) {
        return activeRiderTrip.vehicleId ?? null;
      }
      return null;
    }

    if (activeDriverTrip && isActiveTripPhase(activeDriverTrip.phase)) {
      return activeDriverTrip.vehicleId ?? playerVehicle?.id ?? null;
    }
    if (driverOnline) {
      return playerVehicle?.id ?? null;
    }
    return null;
  }, [mode, activeRiderTrip, activeDriverTrip, driverOnline, playerVehicle]);

  const fitBoundsData = useMemo(() => {
    if (mode === "rider" && riderStep === "tier" && previewRoute && previewRoute.length >= 2) {
      return {
        coords: previewRoute,
        key: `${cityId}:${pickup.id}:${destination?.id ?? "none"}:tier`,
      };
    }
    if (mode === "driver" && driverOffer && !activeDriverTrip) {
      return {
        coords: [...driverOffer.approachRoute, ...driverOffer.route] as LngLat[],
        key: `offer:${driverOffer.id}`,
      };
    }
    return { coords: null, key: undefined };
  }, [mode, riderStep, previewRoute, cityId, pickup.id, destination?.id, driverOffer, activeDriverTrip]);

  const mapPadding = useMemo(() => {
    if (isDesktop) {
      return { top: 64, left: 424, bottom: 20, right: 20 };
    }
    const mobileBottom =
      mode === "driver" ? 270 : riderStep === "trip" ? 250 : 320;
    return { top: 64, bottom: mobileBottom, left: 0, right: 0 };
  }, [isDesktop, mode, riderStep]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-surface">
      <ClientMap
        variant="mobile"
        showCrosshair={showCrosshair}
        showAllTrips={false}
        followVehicleId={followVehicleId}
        previewRoute={previewRoute}
        fitBoundsCoords={fitBoundsData.coords}
        fitBoundsKey={fitBoundsData.key}
        padding={mapPadding}
        onCrosshairSettled={setPickupFromCoords}
        onMapClick={pickingDestinationOnMap ? setDestinationFromCoords : undefined}
        controlsClassName="top-16"
      />

      <TopBar />

      {/* Tap-map-to-set-destination instruction pill */}
      {pickingDestinationOnMap && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-3 md:left-[424px]">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-brand bg-canvas px-3 py-1.5 text-[12px] font-medium text-ink">
            <Icon icon={MapPin} size={14} className="text-live" />
            <span>{s.tapMapBanner}</span>
            <button
              type="button"
              onClick={() => setPickingTarget("pickup")}
              aria-label={s.cancel}
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface hover:text-ink"
            >
              <Icon icon={X} size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Thumb-friendly Bottom Sheet (mobile) / Bottom-Left Floating Panel (desktop) */}
      <section
        aria-label={mode === "driver" ? s.driver : s.rider}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:inset-x-auto md:bottom-3 md:left-3 md:w-[400px]"
      >
        <div className="pointer-events-auto max-h-[62dvh] scroll-y rounded-t-xl border-t border-line bg-canvas px-4 pt-3 pb-safe md:max-h-[calc(100dvh-96px)] md:rounded-xl md:border">
          <HydrationGate
            fallback={
              <div className="space-y-3 py-2">
                <div className="h-14 rounded-lg border border-line bg-surface" />
                <div className="h-10 rounded-lg border border-line bg-surface" />
                <div className="h-12 rounded-lg bg-brand/10" />
              </div>
            }
          >
            {mode === "driver" ? <DriverPanel /> : <RiderSheet onRequestGps={() => requestLocation(true)} />}
          </HydrationGate>
        </div>
      </section>
    </main>
  );
}
