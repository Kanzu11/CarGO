"use client";

import { MapPin } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/cities";
import { getStrings, localizePlaceName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId, Place } from "@/types/fleet";

export interface DestinationPresetsProps {
  cityId: CityId;
  pickupId: string;
  selectedId: string | null;
  pickingOnMap: boolean;
  onSelect: (place: Place) => void;
  onTogglePickOnMap: () => void;
}

/**
 * Instant tap presets for real Ethiopian city landmarks + a "Pick on map" toggle.
 */
export function DestinationPresets({
  cityId,
  pickupId,
  selectedId,
  pickingOnMap,
  onSelect,
  onTogglePickOnMap,
}: DestinationPresetsProps) {
  const locale = useFleetStore((s) => s.locale);
  const s = getStrings(locale);
  const landmarks = CITIES[cityId].landmarks.filter((l) => l.id !== pickupId);

  return (
    <div
      aria-label="Destination presets"
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
    >
      <button
        type="button"
        onClick={onTogglePickOnMap}
        aria-pressed={pickingOnMap}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
          pickingOnMap
            ? "border-live bg-live text-white"
            : "border-line bg-surface text-ink hover:bg-canvas",
        )}
      >
        <Icon icon={MapPin} size={13} />
        {pickingOnMap ? s.tapMapShort : s.pickOnMap}
      </button>

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
