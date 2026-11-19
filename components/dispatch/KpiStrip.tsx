"use client";

import { HydrationGate } from "@/components/system/HydrationGate";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { useFleetStore } from "@/store/useFleetStore";

export interface KpiStripProps {
  compact?: boolean;
  className?: string;
}

/**
 * Tabular live KPI strip for the Ops Command Center top bar.
 */
export function KpiStrip({ compact = false, className }: KpiStripProps) {
  const kpis = useFleetStore((s) => s.kpis);

  return (
    <HydrationGate
      fallback={
        <div
          className={cn(
            "inline-flex h-8 items-center rounded-lg border border-line bg-surface px-3 text-[12px] text-muted",
            className,
          )}
        >
          Loading telemetry…
        </div>
      }
    >
      <div
        aria-label="Live fleet KPIs"
        className={cn(
          "inline-flex items-center divide-x divide-line rounded-lg border border-line bg-surface",
          compact ? "h-8 w-full justify-between" : "h-8",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 px-2.5">
          <StatusDot tone="live" size={6} />
          <span className="text-[11px] text-muted">Active Fleet</span>
          <span className="num text-[12px] font-semibold text-ink">
            {kpis.activeFleet}/{kpis.totalFleet}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5">
          <span className="text-[11px] text-muted">Trips in Progress</span>
          <span className="num text-[12px] font-semibold text-ink">{kpis.tripsInProgress}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5">
          <span className="text-[11px] text-muted">Avg Dispatch</span>
          <span className="num text-[12px] font-semibold text-ink">
            {kpis.avgDispatchSec.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5">
          <span className="text-[11px] text-muted">Live Volume</span>
          <span className="num text-[12px] font-semibold text-live">
            {kpis.liveVolumeEtb.toLocaleString()} ETB
          </span>
        </div>
      </div>
    </HydrationGate>
  );
}
