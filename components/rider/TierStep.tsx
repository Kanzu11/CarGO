"use client";

import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { LandmarkChips } from "@/components/rider/LandmarkChips";
import { PaymentToggle } from "@/components/rider/PaymentToggle";
import { TierRow } from "@/components/rider/TierRow";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRoadRoute } from "@/hooks/useRoadRoute";
import { estimateNearestTierEtaMin } from "@/lib/eta";
import { breakdownFare, quoteAllTiers } from "@/lib/fare";
import { formatEtb, getStrings, localizePlaceName, localizeTier } from "@/lib/i18n";
import { TIER_ORDER } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Rider Step 2 — Multi-modal tier, Ethiopian pickup gate note, upfront fare breakdown,
 * and Telebirr / CBE Birr / Cash payment selection.
 */
export function TierStep() {
  const cityId = useFleetStore((s) => s.cityId);
  const locale = useFleetStore((s) => s.locale);
  const pickup = useFleetStore((s) => s.pickup);
  const destination = useFleetStore((s) => s.destination);
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedTier = useFleetStore((s) => s.selectedTier);
  const setSelectedTier = useFleetStore((s) => s.setSelectedTier);
  const landmarkChip = useFleetStore((s) => s.landmarkChip);
  const setLandmarkChip = useFleetStore((s) => s.setLandmarkChip);
  const customLandmarkNote = useFleetStore((s) => s.customLandmarkNote);
  const setCustomLandmarkNote = useFleetStore((s) => s.setCustomLandmarkNote);
  const paymentMethod = useFleetStore((s) => s.paymentMethod);
  const setPaymentMethod = useFleetStore((s) => s.setPaymentMethod);
  const backToLocationStep = useFleetStore((s) => s.backToLocationStep);
  const confirmRiderBooking = useFleetStore((s) => s.confirmRiderBooking);

  const [showFareDetails, setShowFareDetails] = useState(false);

  const s = getStrings(locale);

  const roadRoute = useRoadRoute(cityId, pickup.coords, destination?.coords ?? pickup.coords);
  const routeDistanceKm = roadRoute?.distanceKm ?? 0.25;

  const quotes = useMemo(() => quoteAllTiers(routeDistanceKm), [routeDistanceKm]);
  const fareBreakdown = useMemo(
    () => breakdownFare(selectedTier, routeDistanceKm),
    [selectedTier, routeDistanceKm],
  );

  const etas = useMemo(() => {
    return {
      bajaj: estimateNearestTierEtaMin("bajaj", pickup.coords, vehicles),
      economy: estimateNearestTierEtaMin("economy", pickup.coords, vehicles),
      minivan: estimateNearestTierEtaMin("minivan", pickup.coords, vehicles),
      cargo: estimateNearestTierEtaMin("cargo", pickup.coords, vehicles),
    };
  }, [pickup.coords, vehicles]);

  const activeQuote = quotes[selectedTier];
  const activeTierCopy = localizeTier(selectedTier, locale);

  return (
    <div className="space-y-2.5">
      {/* Compact header + Fare breakdown toggle */}
      <div className="flex items-center gap-2.5 border-b border-line pb-2">
        <IconButton
          icon={ArrowLeft}
          label={s.editRouteLabel}
          size="sm"
          variant="secondary"
          onClick={backToLocationStep}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {localizePlaceName(pickup, locale)} →{" "}
            {destination ? localizePlaceName(destination, locale) : s.destinationLabel}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="num text-[12px] text-muted">
              {routeDistanceKm.toFixed(1)} km · ~{activeQuote.etaMinutes} {s.min} {s.rideLabel}
            </p>
            <button
              type="button"
              onClick={() => setShowFareDetails((prev) => !prev)}
              aria-expanded={showFareDetails}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-live hover:underline"
            >
              <span>{s.fareDetails}</span>
              <Icon icon={showFareDetails ? ChevronUp : ChevronDown} size={12} />
            </button>
          </div>
        </div>
      </div>

      {showFareDetails && (
        <div className="space-y-1 rounded-lg border border-line bg-surface px-3 py-2 text-[12px]">
          <div className="flex items-center justify-between text-muted">
            <span>{s.baseFare}</span>
            <span className="num text-ink">{formatEtb(fareBreakdown.baseEtb, locale)}</span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span>
              {s.distanceCharge} ({routeDistanceKm.toFixed(1)} km)
            </span>
            <span className="num text-ink">{formatEtb(fareBreakdown.distanceEtb, locale)}</span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span>
              {s.timeCharge} (~{activeQuote.etaMinutes} {s.min})
            </span>
            <span className="num text-ink">{formatEtb(fareBreakdown.timeEtb, locale)}</span>
          </div>
          {fareBreakdown.minimumApplied && (
            <p className="text-[11px] text-muted">{s.minimumFareNote}</p>
          )}
          <div className="flex items-center justify-between border-t border-line pt-1 font-semibold text-ink">
            <span>
              {s.upfrontFare} ({s.locked})
            </span>
            <span className="num text-live">{formatEtb(fareBreakdown.totalEtb, locale)}</span>
          </div>
        </div>
      )}

      {/* Tier options */}
      <div role="radiogroup" aria-label="Select vehicle tier" className="space-y-1.5">
        {TIER_ORDER.map((tier) => (
          <TierRow
            key={tier}
            tier={tier}
            etaMin={etas[tier]}
            fareEtb={quotes[tier].fareEtb}
            selected={selectedTier === tier}
            onSelect={() => setSelectedTier(tier)}
          />
        ))}
      </div>

      {/* Ethiopian pickup landmark gate chip + concise note */}
      <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {s.pickupSpotLabel}
        </p>
        <LandmarkChips value={landmarkChip} onChange={setLandmarkChip} />
        <input
          type="text"
          value={customLandmarkNote}
          onChange={(e) => setCustomLandmarkNote(e.target.value)}
          placeholder={s.landmarkPlaceholder}
          maxLength={60}
          aria-label={s.landmarkPlaceholder}
          className="h-8 w-full rounded-lg border border-line bg-canvas px-2.5 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
      </div>

      <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />

      <Button block size="lg" onClick={confirmRiderBooking}>
        {s.confirmWord} {activeTierCopy.name} •{" "}
        <span className="num">{formatEtb(activeQuote.fareEtb, locale)}</span>
      </Button>
    </div>
  );
}
