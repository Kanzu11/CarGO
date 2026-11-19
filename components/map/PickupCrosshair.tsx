"use client";

import { useNearestPlace } from "@/hooks/useNearestPlace";
import { cn } from "@/lib/cn";
import type { LngLat } from "@/types/fleet";

export interface PickupCrosshairProps {
  centerCoords: LngLat;
  isDragging: boolean;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}

/**
 * Fixed center pickup crosshair pin for landmark-first dispatch.
 * Offsets automatically by MapLibre's padding so the pin tip aligns cleanly with
 * `map.getCenter()` above bottom sheets or side panels.
 */
export function PickupCrosshair({ centerCoords, isDragging, padding }: PickupCrosshairProps) {
  const { formattedLabel } = useNearestPlace(centerCoords);

  const offsetX = ((padding?.left ?? 0) - (padding?.right ?? 0)) / 2;
  const offsetY = ((padding?.top ?? 0) - (padding?.bottom ?? 0)) / 2;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{
        left: `calc(50% + ${offsetX}px)`,
        top: `calc(50% + ${offsetY}px)`,
      }}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-canvas px-2.5 py-1 text-[12px] font-medium text-ink transition-transform duration-150",
            isDragging && "-translate-y-1.5",
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-live" />
          <span className="max-w-[220px] truncate">{formattedLabel}</span>
        </div>

        <div
          className={cn(
            "mt-1 flex flex-col items-center transition-transform duration-150",
            isDragging && "-translate-y-1.5",
          )}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="h-3 w-0.5 bg-brand" />
        </div>

        {/* Ground contact point */}
        <span
          className={cn(
            "h-1.5 w-1.5 -mt-0.5 rounded-full bg-brand transition-opacity duration-150",
            isDragging ? "opacity-40" : "opacity-90",
          )}
        />
      </div>
    </div>
  );
}
