"use client";

import { ArrowRight, ArrowUpDown, Clock, LocateFixed, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { DestinationPresets } from "@/components/rider/DestinationPresets";
import { PlaceSearchInput } from "@/components/rider/PlaceSearchInput";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRoadRoute } from "@/hooks/useRoadRoute";
import { cn } from "@/lib/cn";
import { lockedFare } from "@/lib/fare";
import {
  formatEtb,
  getStrings,
  localizePlaceName,
} from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";

export interface LocationStepProps {
  onRequestGps: () => void;
}

/**
 * Rider Step 1 — Clean Pickup & Destination selection with bilingual place search,
 * Real GPS (`GPS`) / Simulated (`Sim`) toggle, 1-tap stop swap, and Recent Rides.
 */
export function LocationStep({ onRequestGps }: LocationStepProps) {
  const cityId = useFleetStore((s) => s.cityId);
  const locale = useFleetStore((s) => s.locale);
  const locationSource = useFleetStore((s) => s.locationSource);
  const setLocationSource = useFleetStore((s) => s.setLocationSource);
  const geoStatus = useFleetStore((s) => s.geoStatus);
  const userGeo = useFleetStore((s) => s.userGeo);

  const pickup = useFleetStore((s) => s.pickup);
  const destination = useFleetStore((s) => s.destination);
  const pickingTarget = useFleetStore((s) => s.pickingTarget);
  const setPickingTarget = useFleetStore((s) => s.setPickingTarget);
  const setPickup = useFleetStore((s) => s.setPickup);
  const setDestination = useFleetStore((s) => s.setDestination);
  const swapPickupAndDestination = useFleetStore((s) => s.swapPickupAndDestination);
  const recentRiderTrips = useFleetStore((s) => s.recentRiderTrips);
  const rebookRecentTrip = useFleetStore((s) => s.rebookRecentTrip);
  const proceedToTierStep = useFleetStore((s) => s.proceedToTierStep);

  const s = getStrings(locale);

  const roadRoute = useRoadRoute(cityId, destination ? pickup.coords : null, destination?.coords ?? null);

  const routeSummary = useMemo(() => {
    if (!destination || !roadRoute) return null;
    return {
      distanceKm: roadRoute.distanceKm,
      bajajEtb: lockedFare("bajaj", roadRoute.distanceKm),
    };
  }, [destination, roadRoute]);

  const cityRecents = useMemo(
    () => recentRiderTrips.filter((r) => r.cityId === cityId).slice(0, 3),
    [recentRiderTrips, cityId],
  );

  const handleSelectGps = () => {
    if (userGeo) {
      setLocationSource("real");
    }
    onRequestGps();
  };

  return (
    <div className="space-y-2.5">
      <PlaceSearchInput
        cityId={cityId}
        referenceCoords={pickup.coords}
        targetLabel={pickingTarget === "pickup" ? s.pickupLabel : s.destinationLabel}
        onSelectPlace={(place) => {
          if (pickingTarget === "pickup") {
            setPickup(place);
          } else {
            setDestination(place);
          }
        }}
      />

      {/* Pickup block (tap to move pickup pin on map or pick landmark) */}
      <div
        onClick={() => setPickingTarget("pickup")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPickingTarget("pickup");
          }
        }}
        className={cn(
          "cursor-pointer rounded-lg border p-2.5 transition-colors",
          pickingTarget === "pickup"
            ? "border-brand bg-surface"
            : "border-line bg-canvas hover:bg-surface",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-canvas",
                locationSource === "real" ? "border-live" : "border-brand",
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {s.pickupLabel}
                </p>
                {pickingTarget === "pickup" && (
                  <span className="rounded bg-brand px-1.5 py-px text-[10px] font-medium text-white">
                    {s.tapMapShort}
                  </span>
                )}
                {locationSource === "real" && userGeo && (
                  <span className="num rounded bg-live-soft px-1 py-px text-[10px] font-semibold text-live">
                    ±{userGeo.accuracyM}m
                  </span>
                )}
              </div>
              <p className="truncate text-[14px] font-semibold text-ink">
                {localizePlaceName(pickup, locale)}
              </p>
            </div>
          </div>

          {/* Real GPS | Simulated toggle pill */}
          <div
            role="group"
            aria-label="Location source"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-7 shrink-0 items-center rounded-lg border border-line bg-canvas p-0.5"
          >
            <button
              type="button"
              onClick={handleSelectGps}
              aria-pressed={locationSource === "real"}
              title={geoStatus === "requesting" ? s.locating : s.liveGpsBadge}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11px] font-medium transition-colors",
                locationSource === "real"
                  ? "bg-live text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              <Icon icon={LocateFixed} size={11} />
              <span>{geoStatus === "requesting" ? "…" : s.gpsLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setLocationSource("simulated")}
              aria-pressed={locationSource === "simulated"}
              title={s.simulatedBadge}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[11px] font-medium transition-colors",
                locationSource === "simulated"
                  ? "bg-brand text-white"
                  : "text-muted hover:text-ink",
              )}
            >
              <Icon icon={Sparkles} size={11} />
              <span>{s.simLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Destination block + 1-tap swap */}
      <div className="space-y-2">
        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={() => setPickingTarget("destination")}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
              pickingTarget === "destination"
                ? "border-live bg-live-soft"
                : "border-line bg-canvas hover:bg-surface",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-live" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {s.destinationLabel}
                  </p>
                  {pickingTarget === "destination" && (
                    <span className="rounded bg-live px-1.5 py-px text-[10px] font-medium text-white">
                      {s.tapMapShort}
                    </span>
                  )}
                </div>
                <p className="truncate text-[14px] font-semibold text-ink">
                  {destination ? localizePlaceName(destination, locale) : s.chooseLandmark}
                </p>
              </div>
            </div>
            {routeSummary && (
              <span className="num shrink-0 text-[12px] font-medium text-muted">
                {routeSummary.distanceKm.toFixed(1)} km
              </span>
            )}
          </button>

          {destination && (
            <button
              type="button"
              onClick={swapPickupAndDestination}
              aria-label={s.swapLocations}
              title={s.swapLocations}
              className="inline-flex w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink hover:bg-surface"
            >
              <Icon icon={ArrowUpDown} size={15} />
            </button>
          )}
        </div>

        <DestinationPresets
          cityId={cityId}
          selectedId={pickingTarget === "pickup" ? pickup.id : (destination?.id ?? null)}
          excludedId={pickingTarget === "pickup" ? (destination?.id ?? null) : pickup.id}
          onSelect={(place) => {
            if (pickingTarget === "pickup") {
              setPickup(place);
            } else {
              setDestination(place);
            }
          }}
        />

        {cityRecents.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted">
              <Icon icon={Clock} size={11} />
              {s.recentRides}:
            </span>
            {cityRecents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => rebookRecentTrip(item)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2 text-[11px] font-medium text-ink hover:bg-canvas"
              >
                <span className="max-w-[150px] truncate">
                  {localizePlaceName(item.pickup, locale)} → {localizePlaceName(item.dropoff, locale)}
                </span>
                <span className="num text-muted">· {formatEtb(item.fareEtb, locale)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        block
        size="lg"
        trailingIcon={ArrowRight}
        onClick={proceedToTierStep}
        disabled={!destination}
      >
        {routeSummary
          ? `${s.seeRidesFrom} ${formatEtb(routeSummary.bajajEtb, locale)}`
          : s.selectDestination}
      </Button>
    </div>
  );
}
