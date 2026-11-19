"use client";

import { ArrowRight } from "lucide-react";
import { DestinationPresets } from "@/components/rider/DestinationPresets";
import { LandmarkChips } from "@/components/rider/LandmarkChips";
import { Button } from "@/components/ui/Button";
import { lockedFare } from "@/lib/fare";
import { computeCityRoute } from "@/lib/routing";
import { useFleetStore } from "@/store/useFleetStore";
import { useMemo } from "react";

/**
 * Rider Step 1 — Landmark-first Pickup & Destination selection.
 * Solves Ethiopia's lack of street numbers with crosshair landmark resolution,
 * quick landmark chips, and a custom gate/color note.
 */
export function LocationStep() {
  const cityId = useFleetStore((s) => s.cityId);
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

  const routeSummary = useMemo(() => {
    if (!destination) return null;
    const res = computeCityRoute(cityId, pickup.coords, destination.coords);
    return {
      distanceKm: res.distanceKm,
      bajajEtb: lockedFare("bajaj", res.distanceKm),
    };
  }, [cityId, pickup.coords, destination]);

  return (
    <div className="space-y-3">
      {/* Pickup block */}
      <div className="rounded-lg border border-line bg-surface p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand bg-canvas" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Pickup · {landmarkChip}
              </p>
              <p className="truncate text-[14px] font-semibold text-ink">{pickup.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPickingTarget("pickup")}
            className="shrink-0 rounded-[6px] border border-line bg-canvas px-2 py-1 text-[11px] font-medium text-muted hover:text-ink"
          >
            Move pin
          </button>
        </div>

        <div className="mt-2.5 space-y-2">
          <LandmarkChips value={landmarkChip} onChange={setLandmarkChip} />
          <input
            type="text"
            aria-label="Custom pickup landmark note"
            value={customLandmarkNote}
            onChange={(e) => setCustomLandmarkNote(e.target.value)}
            maxLength={60}
            placeholder="Landmark note (e.g. In front of blue gate)"
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
                Destination
              </p>
              <p className="truncate text-[14px] font-semibold text-ink">
                {destination ? destination.name : "Choose a city landmark"}
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
          ? `See Rides • From ${routeSummary.bajajEtb} ETB`
          : "Select Destination"}
      </Button>
    </div>
  );
}
