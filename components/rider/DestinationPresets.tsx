"use client";

import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/cities";
import { localizePlaceName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId, Place } from "@/types/fleet";

export interface DestinationPresetsProps {
  cityId: CityId;
  selectedId: string | null;
  excludedId?: string | null;
  onSelect: (place: Place) => void;
}

/**
 * Instant tap presets for real Ethiopian city landmarks synced to the active
 * Pickup or Destination slot.
 */
export function DestinationPresets({
  cityId,
  selectedId,
  excludedId = null,
  onSelect,
}: DestinationPresetsProps) {
  const locale = useFleetStore((s) => s.locale);
  const landmarks = CITIES[cityId].landmarks.filter((l) => l.id !== excludedId);

  return (
    <div
      aria-label="Landmark presets"
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
    >
      {landmarks.map((place) => {
        const active = place.id === selectedId;
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelect(place)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
              active
                ? "border-live bg-live-soft text-live"
                : "border-line bg-canvas text-ink hover:bg-surface",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                active ? "bg-live" : "bg-[#16A34A]",
              )}
            />
            {localizePlaceName(place, locale)}
          </button>
        );
      })}
    </div>
  );
}
