"use client";

import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { PaymentToggle } from "@/components/rider/PaymentToggle";
import { TierRow } from "@/components/rider/TierRow";
import { Button, IconButton } from "@/components/ui/Button";
import { estimateNearestTierEtaMin } from "@/lib/eta";
import { quoteAllTiers } from "@/lib/fare";
import { formatEtb, getStrings, localizePlaceName, localizeTier } from "@/lib/i18n";
import { computeCityRoute } from "@/lib/routing";
import { TIER_ORDER } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Rider Step 2 — Multi-modal tier & Ethiopian payment selection with upfront locked ETB pricing.
 */
export function TierStep() {
  const cityId = useFleetStore((s) => s.cityId);
  const locale = useFleetStore((s) => s.locale);
  const pickup = useFleetStore((s) => s.pickup);
  const destination = useFleetStore((s) => s.destination);
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedTier = useFleetStore((s) => s.selectedTier);
  const setSelectedTier = useFleetStore((s) => s.setSelectedTier);
  const paymentMethod = useFleetStore((s) => s.paymentMethod);
  const setPaymentMethod = useFleetStore((s) => s.setPaymentMethod);
  const backToLocationStep = useFleetStore((s) => s.backToLocationStep);
  const confirmRiderBooking = useFleetStore((s) => s.confirmRiderBooking);

  const s = getStrings(locale);

  const route = useMemo(() => {
    const destCoords = destination?.coords ?? pickup.coords;
    return computeCityRoute(cityId, pickup.coords, destCoords);
  }, [cityId, pickup.coords, destination]);

  const quotes = useMemo(() => quoteAllTiers(route.distanceKm), [route.distanceKm]);

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
    <div className="space-y-3">
      {/* Compact header */}
      <div className="flex items-center gap-2.5 border-b border-line pb-2.5">
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
          <p className="num text-[12px] text-muted">
            {route.distanceKm.toFixed(1)} km · ~{activeQuote.etaMinutes} {s.min} {s.rideLabel} ·{" "}
            {s.upfrontFare}
          </p>
        </div>
      </div>

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

      <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />

      <Button block size="lg" onClick={confirmRiderBooking}>
        {s.confirmWord} {activeTierCopy.name} •{" "}
        <span className="num">{formatEtb(activeQuote.fareEtb, locale)}</span>
      </Button>
    </div>
  );
}
