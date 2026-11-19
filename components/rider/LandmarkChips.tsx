"use client";

import { cn } from "@/lib/cn";
import { LANDMARK_CHIPS, type LandmarkChip } from "@/types/fleet";

export interface LandmarkChipsProps {
  value: LandmarkChip;
  onChange: (chip: LandmarkChip) => void;
}

/**
 * Single-select quick landmark tags to pinpoint Ethiopia pickup spots without street numbers.
 */
export function LandmarkChips({ value, onChange }: LandmarkChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Pickup landmark type"
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
    >
      {LANDMARK_CHIPS.map((chip) => {
        const active = chip === value;
        return (
          <button
            key={chip}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(chip)}
            className={cn(
              "h-7 shrink-0 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
              active
                ? "border-brand bg-brand text-white"
                : "border-line bg-canvas text-ink hover:bg-surface",
            )}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}
