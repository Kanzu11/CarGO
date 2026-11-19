"use client";

import { MapPin } from "lucide-react";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatClockTime } from "@/lib/dispatchFilters";
import { paymentMethodLabel } from "@/lib/eta";
import type { Trip, TripPhase } from "@/types/fleet";

interface StepSpec {
  phase: TripPhase;
  label: string;
  matchPhases: ReadonlyArray<TripPhase>;
}

const CANONICAL_STEPS: ReadonlyArray<StepSpec> = [
  { phase: "REQUESTED", label: "REQUESTED", matchPhases: ["REQUESTED", "SEARCHING"] },
  { phase: "DRIVER_ASSIGNED", label: "ACCEPTED", matchPhases: ["DRIVER_ASSIGNED"] },
  { phase: "ARRIVING", label: "ARRIVING", matchPhases: ["ARRIVING"] },
  { phase: "IN_PROGRESS", label: "IN_PROGRESS", matchPhases: ["IN_PROGRESS"] },
  { phase: "COMPLETED", label: "COMPLETED", matchPhases: ["COMPLETED"] },
];

function stepOrder(phase: TripPhase): number {
  switch (phase) {
    case "REQUESTED":
    case "SEARCHING":
      return 0;
    case "DRIVER_ASSIGNED":
      return 1;
    case "ARRIVING":
      return 2;
    case "IN_PROGRESS":
      return 3;
    case "COMPLETED":
    case "CANCELLED":
      return 4;
  }
}

export interface TripTimelineProps {
  trip: Trip;
}

/**
 * Active trip lifecycle stepper (REQUESTED -> ACCEPTED -> ARRIVING -> IN_PROGRESS -> COMPLETED)
 * with landmark note callout and ops timeline log.
 */
export function TripTimeline({ trip }: TripTimelineProps) {
  const currentStep = stepOrder(trip.phase);

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="num font-mono text-[12px] font-semibold text-ink">{trip.id}</span>
            <Badge tone="live">{paymentMethodLabel(trip.payment)}</Badge>
          </div>
          <p className="mt-1 truncate text-[12px] font-medium text-ink">
            {trip.pickup.name} → {trip.dropoff.name}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-[14px] font-semibold text-ink">{trip.fareEtb} ETB</p>
          <p className="num text-[11px] text-muted">{trip.distanceKm.toFixed(1)} km</p>
        </div>
      </div>

      {trip.landmarkNote && (
        <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-[12px]">
          <Icon icon={MapPin} size={13} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Landmark Note
            </p>
            <p className="text-ink">{trip.landmarkNote}</p>
          </div>
        </div>
      )}

      {/* Vertical 5-step timeline */}
      <ol className="space-y-2" aria-label="Trip lifecycle timeline">
        {CANONICAL_STEPS.map((step, index) => {
          const entry = trip.timeline
            .slice()
            .reverse()
            .find((item) => step.matchPhases.includes(item.phase));
          const reached = index <= currentStep && trip.phase !== "CANCELLED";
          const isActive = index === currentStep && trip.phase !== "COMPLETED";

          return (
            <li key={step.phase} className="flex items-start gap-2.5">
              <div className="flex flex-col items-center pt-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full border",
                    isActive
                      ? "border-live bg-live"
                      : reached
                        ? "border-brand bg-brand"
                        : "border-line-strong bg-canvas",
                  )}
                />
                {index < CANONICAL_STEPS.length - 1 && (
                  <span
                    className={cn(
                      "mt-1 h-4 w-px",
                      index < currentStep ? "bg-brand" : "bg-line",
                    )}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "font-mono text-[11px] font-semibold",
                      reached ? "text-ink" : "text-muted",
                    )}
                  >
                    {step.label}
                  </span>
                  {entry && (
                    <HydrationGate fallback={<span className="num text-[11px] text-muted">--:--:--</span>}>
                      <span className="num font-mono text-[11px] text-muted">
                        {formatClockTime(entry.at)}
                      </span>
                    </HydrationGate>
                  )}
                </div>
                {entry?.note && (
                  <p className="truncate text-[11px] text-muted">{entry.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
