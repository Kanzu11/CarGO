"use client";

import { Phone, Star, X } from "lucide-react";
import { OpsActions } from "@/components/dispatch/OpsActions";
import { TelemetryGrid } from "@/components/dispatch/TelemetryGrid";
import { TripTimeline } from "@/components/dispatch/TripTimeline";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { statusLabel } from "@/lib/fleetSimulator";
import { TIERS } from "@/lib/tiers";
import { isActiveTripPhase } from "@/lib/tripMachine";
import { useFleetStore } from "@/store/useFleetStore";
import type { Vehicle, VehicleStatus } from "@/types/fleet";

function statusTones(status: VehicleStatus): { badge: Tone; dot: DotTone } {
  switch (status) {
    case "on_trip":
      return { badge: "live", dot: "live" };
    case "enroute_pickup":
      return { badge: "warn", dot: "warn" };
    case "alert":
      return { badge: "danger", dot: "danger" };
    case "idle":
    case "offline":
      return { badge: "neutral", dot: "idle" };
  }
}

export interface InspectorProps {
  vehicle: Vehicle;
}

/**
 * 340px right-hand live Telemetry Inspector drawer opened on vehicle/trip selection.
 */
export function Inspector({ vehicle }: InspectorProps) {
  const trips = useFleetStore((s) => s.trips);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  const activeTrip = trips.find(
    (t) =>
      (vehicle.tripId ? t.id === vehicle.tripId : t.vehicleId === vehicle.id) &&
      isActiveTripPhase(t.phase),
  );

  const tones = statusTones(vehicle.status);

  return (
    <aside
      aria-label={`Telemetry inspector for ${vehicle.id}`}
      className="flex h-full w-full flex-col overflow-hidden border-l border-line bg-canvas md:w-[340px] md:shrink-0"
    >
      {/* Header */}
      <div className="shrink-0 space-y-2 border-b border-line p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <StatusDot
                tone={tones.dot}
                pulse={vehicle.status === "alert" || vehicle.status === "on_trip"}
                size={8}
              />
              <span className="num font-mono text-[14px] font-semibold text-ink">
                {vehicle.id}
              </span>
              <Badge>{TIERS[vehicle.tier].name}</Badge>
              <Badge tone={tones.badge}>{statusLabel(vehicle.status)}</Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={() => selectVehicle(null)}
            aria-label="Close telemetry inspector"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink"
          >
            <Icon icon={X} size={14} />
          </button>
        </div>

        {/* Driver & Plate metadata */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{vehicle.driver.name}</p>
            <p className="num flex items-center gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-0.5 text-ink">
                <Icon icon={Star} size={11} className="fill-warn text-warn" />
                {vehicle.driver.rating.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon icon={Phone} size={11} />
                {vehicle.driver.phone}
              </span>
            </p>
          </div>
          <Badge mono>{vehicle.plate}</Badge>
        </div>
      </div>

      {/* Scrollable telemetry + actions + trip timeline */}
      <div className="scroll-y flex-1 space-y-3 p-3">
        <TelemetryGrid vehicle={vehicle} />
        <OpsActions vehicle={vehicle} activeTrip={activeTrip} />

        {activeTrip ? (
          <TripTimeline trip={activeTrip} />
        ) : (
          <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12px] text-muted">
            Unit is currently idle near{" "}
            <strong className="font-medium text-ink">{vehicle.landmark}</strong> awaiting next
            landmark dispatch.
          </div>
        )}
      </div>
    </aside>
  );
}
