"use client";

import { MapPin } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { TIERS } from "@/lib/tiers";
import type { Trip, TripPhase } from "@/types/fleet";

function phaseBadge(phase: TripPhase): { label: string; tone: Tone } {
  switch (phase) {
    case "IN_PROGRESS":
      return { label: "In Progress", tone: "live" };
    case "ARRIVING":
      return { label: "Arriving", tone: "warn" };
    case "DRIVER_ASSIGNED":
      return { label: "Assigned", tone: "neutral" };
    case "SEARCHING":
    case "REQUESTED":
      return { label: "Searching", tone: "warn" };
    case "COMPLETED":
      return { label: "Completed", tone: "live" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "danger" };
  }
}

export interface TripRowProps {
  trip: Trip;
  selected: boolean;
  onSelect: () => void;
}

/** Dense active-trip row inside the `/dispatch` fleet sidebar. */
export function TripRow({ trip, selected, onSelect }: TripRowProps) {
  const badge = phaseBadge(trip.phase);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!trip.vehicleId}
      className={cn(
        "flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors disabled:opacity-65",
        selected ? "border-l-2 border-l-brand bg-surface" : "hover:bg-surface",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="num font-mono text-[11px] font-semibold text-ink">{trip.id}</span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <Badge>{TIERS[trip.tier].name}</Badge>
        </div>

        <p className="mt-1 truncate text-[12px] font-medium text-ink">
          {trip.pickup.name} → {trip.dropoff.name}
        </p>

        {trip.landmarkNote && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
            <Icon icon={MapPin} size={11} className="shrink-0 text-live" />
            <span className="truncate">{trip.landmarkNote}</span>
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="num text-[12px] font-semibold text-ink">{trip.fareEtb} ETB</p>
        <p className="num text-[11px] text-muted">{trip.remainingEtaMin} min</p>
      </div>
    </button>
  );
}
