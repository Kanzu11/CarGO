"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { breakdownFare } from "@/lib/fare";
import {
  formatEtb,
  getStrings,
  localizePayment,
  localizePlaceName,
  localizeTier,
} from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { Trip } from "@/types/fleet";

export interface TripReceiptProps {
  trip: Trip;
  onDone: (rating: number) => void;
}

/**
 * Completed trip receipt with locked fare breakdown, payment method, and 5-star rating.
 */
export function TripReceipt({ trip, onDone }: TripReceiptProps) {
  const [rating, setRating] = useState(5);
  const locale = useFleetStore((s) => s.locale);
  const s = getStrings(locale);
  const breakdown = useMemo(
    () => breakdownFare(trip.tier, trip.distanceKm),
    [trip.tier, trip.distanceKm],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon icon={CheckCircle2} size={18} className="shrink-0 text-live" />
          <div>
            <p className="text-[15px] font-semibold text-ink">{s.tripCompleted}</p>
            <p className="text-[12px] text-muted">
              {localizeTier(trip.tier, locale).name} ·{" "}
              <span className="num">{trip.distanceKm.toFixed(1)} km</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="num text-[18px] font-semibold text-ink">
            {formatEtb(trip.fareEtb, locale)}
          </p>
          <Badge tone="live">{localizePayment(trip.payment, locale)}</Badge>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5 text-[12px]">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-ink">
            {localizePlaceName(trip.pickup, locale)} →{" "}
            {localizePlaceName(trip.dropoff, locale)}
          </span>
          <span className="num shrink-0 font-mono text-[11px] text-muted">{trip.id}</span>
        </div>
        {trip.driver && (
          <p className="text-muted">
            {s.driverLabel}: <span className="font-medium text-ink">{trip.driver.name}</span>
            {trip.plate ? (
              <>
                {" · "}
                <span className="num font-mono">{trip.plate}</span>
              </>
            ) : null}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-line pt-1.5 text-[11px] text-muted">
          <span>
            {s.baseFare} {formatEtb(breakdown.baseEtb, locale)} + {s.distanceCharge}{" "}
            {formatEtb(breakdown.distanceEtb + breakdown.timeEtb, locale)}
          </span>
          <span className="num font-semibold text-ink">{formatEtb(trip.fareEtb, locale)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2">
        <span className="text-[13px] font-medium text-ink">{s.rateDriver}</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={s.rateDriver}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= rating;
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star}`}
                onClick={() => setRating(star)}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-surface"
              >
                <Icon
                  icon={Star}
                  size={17}
                  className={cn(active ? "fill-warn text-warn" : "text-line-strong")}
                />
              </button>
            );
          })}
        </div>
      </div>

      <Button block size="lg" onClick={() => onDone(rating)}>
        {s.done}
      </Button>
    </div>
  );
}
