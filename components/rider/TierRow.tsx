"use client";

import { Bike, Bus, Car, Truck, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatEtb, getStrings, localizeTier } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import type { Tier } from "@/types/fleet";

const TIER_ICONS: Record<Tier, LucideIcon> = {
  bajaj: Bike,
  economy: Car,
  minivan: Bus,
  cargo: Truck,
};

export interface TierRowProps {
  tier: Tier;
  etaMin: number;
  fareEtb: number;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Scannable flat vehicle tier option displaying icon, capacity, live ETA, and locked ETB fare.
 */
export function TierRow({ tier, etaMin, fareEtb, selected, onSelect }: TierRowProps) {
  const locale = useFleetStore((s) => s.locale);
  const meta = localizeTier(tier, locale);
  const s = getStrings(locale);
  const Glyph = TIER_ICONS[tier];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-brand bg-surface"
          : "border-line bg-canvas hover:bg-surface",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            selected
              ? "border-brand bg-brand text-white"
              : "border-line bg-surface text-ink",
          )}
        >
          <Icon icon={Glyph} size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-ink">{meta.name}</span>
            <span className="text-[12px] text-muted">· {meta.capacityLabel}</span>
          </div>
          <p className="text-[12px] text-muted">
            <span className="num font-medium text-live">
              {etaMin} {s.min}
            </span>{" "}
            {s.away} · {meta.tagline}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="num text-[15px] font-semibold text-ink">{formatEtb(fareEtb, locale)}</p>
        <p className="text-[11px] font-medium text-muted">{s.locked}</p>
      </div>
    </button>
  );
}
