"use client";

import { MapPin } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { cardinalFromBearing } from "@/lib/geo";
import type { Vehicle } from "@/types/fleet";

export interface TelemetryGridProps {
  vehicle: Vehicle;
}

/**
 * Live 2×2 tabular telemetry grid: Speed, Heading, Lat/Lng, Signal Quality + landmark tag.
 */
export function TelemetryGrid({ vehicle }: TelemetryGridProps) {
  const cardinal = cardinalFromBearing(vehicle.bearing);
  const roundedHeading = Math.round(((vehicle.bearing % 360) + 360) % 360);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Speed</p>
          <p className="num mt-0.5 text-[15px] font-semibold text-ink">
            {vehicle.speedKmh} <span className="text-[12px] font-normal text-muted">km/h</span>
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Heading</p>
          <p className="num mt-0.5 text-[15px] font-semibold text-ink">
            {roundedHeading}° <span className="text-[12px] font-medium text-muted">{cardinal}</span>
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Lat / Lng</p>
          <p className="num mt-0.5 truncate font-mono text-[11px] font-medium text-ink">
            {vehicle.position[1].toFixed(5)}, {vehicle.position[0].toFixed(5)}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Signal</p>
          <div className="mt-1 flex items-end justify-between">
            <div className="flex items-end gap-1" aria-label={`Signal ${vehicle.signal} of 4`}>
              {[1, 2, 3, 4].map((bar) => {
                const active = bar <= vehicle.signal;
                return (
                  <span
                    key={bar}
                    className={cn(
                      "w-1.5 rounded-[1px]",
                      active
                        ? vehicle.signal >= 3
                          ? "bg-live"
                          : "bg-warn"
                        : "bg-line",
                    )}
                    style={{ height: 4 + bar * 3 }}
                  />
                );
              })}
            </div>
            <span className="num text-[12px] font-medium text-ink">{vehicle.signal}/4</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px]">
        <Icon icon={MapPin} size={13} className="shrink-0 text-live" />
        <span className="truncate font-medium text-ink">{vehicle.landmark}</span>
      </div>
    </div>
  );
}
