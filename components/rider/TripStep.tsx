"use client";

import { MapPin, MessageSquare, Phone, ShieldAlert, Star } from "lucide-react";
import { TripReceipt } from "@/components/rider/TripReceipt";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { driverInitials } from "@/lib/eta";
import {
  formatEtb,
  getStrings,
  localizePayment,
  localizePlaceName,
  localizeTier,
} from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import { toast } from "@/store/useToastStore";
import type { Locale, Trip, TripPhase } from "@/types/fleet";

interface PhaseCopy {
  title: string;
  subtitle: string;
  tone: DotTone;
  stepIndex: number;
}

function describePhase(trip: Trip, locale: Locale): PhaseCopy {
  const s = getStrings(locale);
  const tierName = localizeTier(trip.tier, locale).name;
  const dropoffName = localizePlaceName(trip.dropoff, locale);

  switch (trip.phase) {
    case "REQUESTED":
    case "SEARCHING":
      return {
        title: `${s.findingNearby} ${tierName}…`,
        subtitle: s.broadcastingTag,
        tone: "warn",
        stepIndex: 0,
      };
    case "DRIVER_ASSIGNED":
      return {
        title: s.driverAssigned,
        subtitle: `${trip.driver?.name ?? tierName} ${s.preparingHeadOver}`,
        tone: "warn",
        stepIndex: 1,
      };
    case "ARRIVING":
      return {
        title: s.driverArriving,
        subtitle: `${trip.remainingEtaMin} ${s.min} · ${trip.remainingKm.toFixed(1)} km ${s.toPickup}`,
        tone: "warn",
        stepIndex: 2,
      };
    case "IN_PROGRESS":
      return {
        title: s.tripInProgress,
        subtitle: `${trip.remainingEtaMin} ${s.min} · ${trip.remainingKm.toFixed(1)} km → ${dropoffName}`,
        tone: "live",
        stepIndex: 3,
      };
    case "COMPLETED":
    case "CANCELLED":
      return {
        title: s.tripCompleted,
        subtitle: dropoffName,
        tone: "live",
        stepIndex: 4,
      };
  }
}

export interface TripStepProps {
  trip: Trip;
}

/**
 * Rider Step 3 — Real-time trip lifecycle:
 * SEARCHING -> DRIVER_ASSIGNED -> ARRIVING -> IN_PROGRESS -> COMPLETED.
 */
export function TripStep({ trip }: TripStepProps) {
  const locale = useFleetStore((s) => s.locale);
  const cancelActiveRiderTrip = useFleetStore((s) => s.cancelActiveRiderTrip);
  const completeAndResetRiderTrip = useFleetStore((s) => s.completeAndResetRiderTrip);
  const sendRiderQuickNote = useFleetStore((s) => s.sendRiderQuickNote);
  const triggerRiderSos = useFleetStore((s) => s.triggerRiderSos);

  if (trip.phase === "COMPLETED") {
    return <TripReceipt trip={trip} onDone={completeAndResetRiderTrip} />;
  }

  const s = getStrings(locale);
  const info = describePhase(trip, locale);
  const canCancel = trip.phase !== "IN_PROGRESS";
  const tierName = localizeTier(trip.tier, locale).name;

  const progressLabels: ReadonlyArray<{ phase: TripPhase; label: string }> = [
    { phase: "SEARCHING", label: s.stepMatch },
    { phase: "DRIVER_ASSIGNED", label: s.stepAssigned },
    { phase: "ARRIVING", label: s.stepPickup },
    { phase: "IN_PROGRESS", label: s.stepEnRoute },
  ];

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
          <p className="num text-[14px] font-semibold text-ink">
            {formatEtb(trip.fareEtb, locale)}
          </p>
          <p className="text-[11px] text-muted">{localizePayment(trip.payment, locale)}</p>
        </div>
      </div>

      {/* 4-segment flat progress bar */}
      <div className="grid grid-cols-4 gap-1" aria-label="Trip progress">
        {progressLabels.map((item, idx) => {
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

      {/* Driver & vehicle card */}
      {trip.driver ? (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-2.5">
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
                  <span>· {tierName}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {trip.plate && <Badge mono>{trip.plate}</Badge>}
              <a
                href={`tel:${trip.driver.phone}`}
                onClick={() =>
                  toast(`${s.callDriver}: ${trip.driver?.name}`, {
                    description: trip.driver?.phone,
                    tone: "neutral",
                  })
                }
                aria-label={`${s.callDriver} ${trip.driver.name}`}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-canvas px-2 text-[11px] font-medium text-ink hover:bg-surface"
              >
                <Icon icon={Phone} size={11} />
                <span>{s.callDriver}</span>
              </a>
            </div>
          </div>

          {trip.landmarkNote && (
            <div className="flex items-center gap-1.5 rounded-[6px] border border-line bg-canvas px-2 py-1 text-[12px] text-ink">
              <Icon icon={MapPin} size={13} className="shrink-0 text-live" />
              <span className="truncate">{trip.landmarkNote}</span>
            </div>
          )}

          {canCancel && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <Icon icon={MessageSquare} size={12} className="shrink-0 text-muted" />
              {[s.quickNoteAtGate, s.quickNoteBesideBank, s.quickNoteOnMyWay].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => sendRiderQuickNote(quick)}
                  className="h-6 shrink-0 rounded-[6px] border border-line bg-canvas px-2 text-[11px] font-medium text-ink hover:bg-surface"
                >
                  {quick}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-muted">
          <Icon icon={MapPin} size={14} className="shrink-0 text-brand" />
          <span className="truncate">
            {s.pickupLabel}:{" "}
            <strong className="font-medium text-ink">
              {localizePlaceName(trip.pickup, locale)}
            </strong>
            {trip.landmarkNote ? ` (${trip.landmarkNote})` : ""}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canCancel ? (
          <Button variant="secondary" className="flex-1" onClick={cancelActiveRiderTrip}>
            {s.cancelRide}
          </Button>
        ) : (
          <div className="flex h-10 flex-1 items-center rounded-lg border border-line bg-surface px-3 text-[12px] text-muted">
            <span className="truncate">
              {s.headingTo} {localizePlaceName(trip.dropoff, locale)}
            </span>
          </div>
        )}
        <Button variant="danger" leadingIcon={ShieldAlert} onClick={triggerRiderSos}>
          {s.sos}
        </Button>
      </div>
    </div>
  );
}
