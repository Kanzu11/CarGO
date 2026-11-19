"use client";

import { Badge } from "@/components/ui/Badge";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { formatEtb, localizeLandmarkNameString, localizeTier } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { Vehicle, VehicleStatus } from "@/types/fleet";

function statusDotTone(status: VehicleStatus): DotTone {
  switch (status) {
    case "on_trip":
      return "live";
    case "enroute_pickup":
      return "warn";
    case "alert":
      return "danger";
    case "idle":
    case "offline":
      return "idle";
  }
}

export interface VehicleRowProps {
  vehicle: Vehicle;
  activeFareEtb?: number;
  selected: boolean;
  onSelect: () => void;
}

/** Dense 48px fleet unit row inside the `/dispatch` sidebar. */
export function VehicleRow({ vehicle, activeFareEtb, selected, onSelect }: VehicleRowProps) {
  const locale = useFleetStore((s) => s.locale);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
        selected ? "border-l-2 border-l-brand bg-surface" : "hover:bg-surface",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <StatusDot
            tone={statusDotTone(vehicle.status)}
            pulse={vehicle.status === "alert"}
            size={6}
          />
          <span className="num font-mono text-[12px] font-semibold text-ink">
            {vehicle.id}
          </span>
          <Badge tone={vehicle.flagged ? "danger" : "neutral"}>
            {localizeTier(vehicle.tier, locale).name}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-muted">
          {localizeLandmarkNameString(vehicle.landmark, locale)} · {vehicle.driver.name}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="num text-[12px] font-semibold text-ink">
          {typeof activeFareEtb === "number" ? formatEtb(activeFareEtb, locale) : "—"}
        </p>
        <p className="num text-[11px] text-muted">{vehicle.speedKmh} km/h</p>
      </div>
    </button>
  );
}
