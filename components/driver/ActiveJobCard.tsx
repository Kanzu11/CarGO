"use client";

import { ArrowRight, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusDot } from "@/components/ui/StatusDot";
import { formatEtb, getStrings, localizePayment, localizePlaceName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { Locale, Trip } from "@/types/fleet";

export interface ActiveJobCardProps {
  trip: Trip;
}

interface ActionSpec {
  badgeText: string;
  badgeTone: "warn" | "live";
  buttonLabel: string;
  buttonVariant: "primary" | "live";
}

function resolveDriverAction(trip: Trip, locale: Locale): ActionSpec {
  const s = getStrings(locale);
  const hasArrivedAtPin =
    trip.phase === "ARRIVING" &&
    (trip.progress >= 0.99 ||
      trip.timeline.some((entry) => entry.note?.startsWith("Arrived at ")));

  if (trip.phase === "DRIVER_ASSIGNED" || (trip.phase === "ARRIVING" && !hasArrivedAtPin)) {
    return {
      badgeText: s.enRoutePickup,
      badgeTone: "warn",
      buttonLabel: s.arrivedAtPickup,
      buttonVariant: "primary",
    };
  }

  if (trip.phase === "ARRIVING") {
    return {
      badgeText: s.atPickupLandmark,
      badgeTone: "warn",
      buttonLabel: s.startTrip,
      buttonVariant: "live",
    };
  }

  return {
    badgeText: s.tripInProgress,
    badgeTone: "live",
    buttonLabel: `${s.completeTrip} • +${formatEtb(trip.fareEtb, locale)}`,
    buttonVariant: "primary",
  };
}

/**
 * Active Driver Mode trip execution card: Arrived at Pickup -> Start Trip -> Complete Trip.
 */
export function ActiveJobCard({ trip }: ActiveJobCardProps) {
  const locale = useFleetStore((s) => s.locale);
  const advanceDriverJob = useFleetStore((s) => s.advanceDriverJob);
  const cancelActiveDriverTrip = useFleetStore((s) => s.cancelActiveDriverTrip);

  const s = getStrings(locale);
  const spec = resolveDriverAction(trip, locale);

  return (
    <div className="space-y-2.5 rounded-lg border border-line bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StatusDot tone={spec.badgeTone} pulse size={8} />
          <Badge tone={spec.badgeTone}>{spec.badgeText}</Badge>
          <Badge>{localizePayment(trip.payment, locale)}</Badge>
        </div>
        <span className="num text-[15px] font-semibold text-ink">
          {formatEtb(trip.fareEtb, locale)}
        </span>
      </div>

      <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5 text-[12px]">
        <div className="flex items-start gap-2">
          <Icon icon={MapPin} size={14} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{localizePlaceName(trip.pickup, locale)}</p>
            {trip.landmarkNote && <p className="text-muted">{trip.landmarkNote}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <Icon icon={Navigation} size={14} className="shrink-0 text-live" />
            <span className="truncate font-medium text-ink">
              {localizePlaceName(trip.dropoff, locale)}
            </span>
          </div>
          <span className="num shrink-0 text-muted">{trip.distanceKm.toFixed(1)} km</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={spec.buttonVariant}
          size="lg"
          className="flex-1"
          trailingIcon={ArrowRight}
          onClick={advanceDriverJob}
        >
          {spec.buttonLabel}
        </Button>
        {trip.phase !== "IN_PROGRESS" && (
          <Button variant="secondary" size="lg" onClick={cancelActiveDriverTrip}>
            {s.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
