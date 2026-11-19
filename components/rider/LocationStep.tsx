"use client";

import { ArrowRight, LocateFixed, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { DestinationPresets } from "@/components/rider/DestinationPresets";
import { LandmarkChips } from "@/components/rider/LandmarkChips";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { lockedFare } from "@/lib/fare";
import {
  formatEtb,
  getStrings,
  localizeLandmarkChip,
  localizePlaceName,
} from "@/lib/i18n";
import { computeCityRoute } from "@/lib/routing";
import { useFleetStore } from "@/store/useFleetStore";

export interface LocationStepProps {
  onRequestGps: () => void;
}

/**
 * Rider Step 1 — Landmark-first Pickup & Destination selection with
 * Real GPS (`GPS`) and Simulated (`Sim`) dual location toggle.
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
  const setDestination = useFleetStore((s) => s.setDestination);
  const landmarkChip = useFleetStore((s) => s.landmarkChip);
  const setLandmarkChip = useFleetStore((s) => s.setLandmarkChip);
  const customLandmarkNote = useFleetStore((s) => s.customLandmarkNote);
  const setCustomLandmarkNote = useFleetStore((s) => s.setCustomLandmarkNote);
  const proceedToTierStep = useFleetStore((s) => s.proceedToTierStep);

  const s = getStrings(locale);

  const routeSummary = useMemo(() => {
    if (!destination) return null;
    const res = computeCityRoute(cityId, pickup.coords, destination.coords);
    return {
      distanceKm: res.distanceKm,
      bajajEtb: lockedFare("bajaj", res.distanceKm),
    };
  }, [cityId, pickup.coords, destination]);

  const handleSelectGps = () => {
    if (userGeo) {
      setLocationSource("real");
    }
    onRequestGps();
  };

  return (
    <div className="space-y-3">
      {/* Pickup block */}
      <div className="rounded-lg border border-line bg-surface p-2.5">
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
                  {s.pickupLabel} · {localizeLandmarkChip(landmarkChip, locale)}
                </p>
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

        <div className="mt-2.5 space-y-2">
          <LandmarkChips value={landmarkChip} onChange={setLandmarkChip} />
          <input
            type="text"
            aria-label={s.landmarkNoteLabel}
            value={customLandmarkNote}
            onChange={(e) => setCustomLandmarkNote(e.target.value)}
            maxLength={60}
            placeholder={s.landmarkPlaceholder}
            className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 text-[13px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Destination block */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-live" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {s.destinationLabel}
              </p>
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
        </div>

        <DestinationPresets
          cityId={cityId}
          pickupId={pickup.id}
          selectedId={destination?.id ?? null}
          pickingOnMap={pickingTarget === "destination"}
          onSelect={(place) => {
            setDestination(place);
            setPickingTarget("pickup");
          }}
          onTogglePickOnMap={() =>
            setPickingTarget(pickingTarget === "destination" ? "pickup" : "destination")
          }
        />
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
