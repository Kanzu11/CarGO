"use client";

import { MapPin, ShieldAlert, Star } from "lucide-react";
import { TripReceipt } from "@/components/rider/TripReceipt";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { driverInitials, paymentMethodLabel } from "@/lib/eta";
import { TIERS } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";
import type { Trip, TripPhase } from "@/types/fleet";

interface PhaseCopy {
  title: string;
  subtitle: string;
  tone: DotTone;
  stepIndex: number;
}

function describePhase(trip: Trip): PhaseCopy {
  const tierName = TIERS[trip.tier].name;
  switch (trip.phase) {
    case "REQUESTED":
    case "SEARCHING":
      return {
        title: `Finding nearby ${tierName}…`,
        subtitle: "Broadcasting landmark tag to nearby units",
        tone: "warn",
        stepIndex: 0,
      };
    case "DRIVER_ASSIGNED":
      return {
        title: "Driver assigned",
        subtitle: `${trip.driver?.name ?? tierName} is preparing to head over`,
        tone: "warn",
        stepIndex: 1,
      };
    case "ARRIVING":
      return {
        title: "Driver arriving",
        subtitle: `${trip.remainingEtaMin} min · ${trip.remainingKm.toFixed(1)} km to pickup`,
        tone: "warn",
        stepIndex: 2,
      };
    case "IN_PROGRESS":
      return {
        title: "Trip in progress",
        subtitle: `${trip.remainingEtaMin} min · ${trip.remainingKm.toFixed(1)} km to ${trip.dropoff.name}`,
        tone: "live",
        stepIndex: 3,
      };
    case "COMPLETED":
    case "CANCELLED":
      return {
        title: "Trip finished",
        subtitle: trip.dropoff.name,
        tone: "live",
        stepIndex: 4,
      };
  }
}

const PROGRESS_LABELS: ReadonlyArray<{ phase: TripPhase; label: string }> = [
  { phase: "SEARCHING", label: "Match" },
  { phase: "DRIVER_ASSIGNED", label: "Assigned" },
  { phase: "ARRIVING", label: "Pickup" },
  { phase: "IN_PROGRESS", label: "En route" },
];

export interface TripStepProps {
  trip: Trip;
}

/**
 * Rider Step 3 — Real-time trip lifecycle:
 * SEARCHING -> DRIVER_ASSIGNED -> ARRIVING -> IN_PROGRESS -> COMPLETED.
 */
export function TripStep({ trip }: TripStepProps) {
  const cancelActiveRiderTrip = useFleetStore((s) => s.cancelActiveRiderTrip);
  const completeAndResetRiderTrip = useFleetStore((s) => s.completeAndResetRiderTrip);
  const triggerRiderSos = useFleetStore((s) => s.triggerRiderSos);

  if (trip.phase === "COMPLETED") {
    return <TripReceipt trip={trip} onDone={completeAndResetRiderTrip} />;
  }

  const info = describePhase(trip);
  const canCancel = trip.phase !== "IN_PROGRESS";

  return (
    <div className="space-y-3">
      {/* Phase status header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot tone={info.tone} pulse size={8} />
            <h2 className="truncate text-[15px] font-semibold text-ink">{info.title}</h2>
          </div>
          <p className="num mt-0.5 truncate text-[12px] text-muted">{info.subtitle}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-[14px] font-semibold text-ink">{trip.fareEtb} ETB</p>
          <p className="text-[11px] text-muted">{paymentMethodLabel(trip.payment)}</p>
        </div>
      </div>

      {/* 4-segment flat progress bar */}
      <div className="grid grid-cols-4 gap-1" aria-label="Trip progress">
        {PROGRESS_LABELS.map((item, idx) => {
          const isCurrent = idx === info.stepIndex;
          const isDone = idx < info.stepIndex;
          return (
            <div key={item.phase} className="space-y-1">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
                {isDone && (
                  <div
                    className={cn(
                      "h-full w-full",
                      trip.phase === "IN_PROGRESS" ? "bg-live" : "bg-brand",
                    )}
                  />
                )}
                {isCurrent && (
                  <div
                    className={cn(
                      "h-full",
                      trip.phase === "SEARCHING"
                        ? "w-2/5 animate-indeterminate bg-warn"
                        : trip.phase === "IN_PROGRESS"
                          ? "w-full bg-live"
                          : "w-full bg-warn",
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-[10px] font-medium",
                  isCurrent || isDone ? "text-ink" : "text-muted",
                )}
              >
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Driver & vehicle card (once assigned) */}
      {trip.driver ? (
        <div className="rounded-lg border border-line bg-surface p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-[12px] font-semibold text-white">
                {driverInitials(trip.driver.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{trip.driver.name}</p>
                <p className="num flex items-center gap-1 text-[12px] text-muted">
                  <Icon icon={Star} size={12} className="fill-warn text-warn" />
                  <span className="font-medium text-ink">{trip.driver.rating.toFixed(2)}</span>
                  <span>· {TIERS[trip.tier].name}</span>
                </p>
              </div>
            </div>
            {trip.plate && <Badge mono>{trip.plate}</Badge>}
          </div>

          {trip.landmarkNote && (
            <div className="flex items-center gap-1.5 rounded-[6px] border border-line bg-canvas px-2 py-1 text-[12px] text-ink">
              <Icon icon={MapPin} size={13} className="shrink-0 text-live" />
              <span className="truncate">{trip.landmarkNote}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-muted">
          <Icon icon={MapPin} size={14} className="shrink-0 text-brand" />
          <span className="truncate">
            Pickup: <strong className="font-medium text-ink">{trip.pickup.name}</strong>
            {trip.landmarkNote ? ` (${trip.landmarkNote})` : ""}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canCancel ? (
          <Button variant="secondary" className="flex-1" onClick={cancelActiveRiderTrip}>
            Cancel Ride
          </Button>
        ) : (
          <div className="flex flex-1 items-center rounded-lg border border-line bg-surface px-3 h-10 text-[12px] text-muted">
            <span className="truncate">Heading to {trip.dropoff.name}</span>
          </div>
        )}
        <Button variant="danger" leadingIcon={ShieldAlert} onClick={triggerRiderSos}>
          SOS
        </Button>
      </div>
    </div>
  );
}
