"use client";

import { Compass, Layers, LocateFixed, Minus, Pause, Play, Plus } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { PerfTier } from "@/components/map/usePerfTier";
import type { MapStyleMode } from "@/types/fleet";

export interface MapControlsProps {
  is3d: boolean;
  styleMode: MapStyleMode;
  bearing: number;
  perfTier: PerfTier;
  trafficEnabled: boolean;
  mapLabel?: string;
  satLabel?: string;
  trafficLabel?: string;
  onToggleStyleMode: () => void;
  onToggleTraffic: () => void;
  onToggle3d: () => void;
  onRecenter: () => void;
  onResetNorth: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}

/**
 * Flat floating map control stack: 1px hairline borders, crisp white surface,
 * zero shadows and zero blur. Provides Map/Satellite basemap toggle, 2D/3D toggle,
 * Simulate Traffic toggle, recenter, compass reset, and zoom.
 */
export function MapControls({
  is3d,
  styleMode,
  bearing,
  perfTier,
  trafficEnabled,
  mapLabel = "Map",
  satLabel = "Sat",
  trafficLabel = "Traffic",
  onToggleStyleMode,
  onToggleTraffic,
  onToggle3d,
  onRecenter,
  onResetNorth,
  onZoomIn,
  onZoomOut,
  className,
}: MapControlsProps) {
  const isSat = styleMode === "satellite";

  return (
    <div
      className={cn("pointer-events-auto flex flex-col items-end gap-2", className)}
      aria-label="Map controls"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleStyleMode}
          aria-pressed={isSat}
          aria-label="Switch map basemap style"
          title={isSat ? "Satellite Hybrid 3D — tap for Architectural Map" : "Architectural 3D Map — tap for Satellite"}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
            isSat
              ? "border-brand bg-brand text-white hover:bg-[#27272a]"
              : "border-line bg-canvas text-ink hover:bg-surface",
          )}
        >
          <Icon icon={Layers} size={13} />
          <span>{isSat ? satLabel : mapLabel}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTraffic}
          aria-pressed={trafficEnabled}
          aria-label="Simulate Traffic"
          title={trafficEnabled ? "Simulate Traffic: ON" : "Simulate Traffic: PAUSED"}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
            trafficEnabled
              ? "border-live bg-live text-white hover:bg-[#065f46]"
              : "border-line bg-canvas text-ink hover:bg-surface",
          )}
        >
          <Icon icon={trafficEnabled ? Pause : Play} size={13} />
          <span>{trafficLabel}</span>
        </button>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-canvas divide-y divide-line">
        <button
          type="button"
          onClick={onToggle3d}
          aria-pressed={is3d}
          aria-label={is3d ? "Switch to 2D map" : "Switch to 3D map"}
          title={
            is3d
              ? `3D view (${perfTier === "lite" ? "Lite" : "Full"}) — tap for 2D`
              : "2D view — tap for 3D"
          }
          className={cn(
            "num flex h-10 w-10 items-center justify-center text-[12px] font-semibold transition-colors",
            is3d ? "bg-brand text-white hover:bg-[#27272a]" : "bg-canvas text-ink hover:bg-surface",
          )}
        >
          {is3d ? "3D" : "2D"}
        </button>

        <button
          type="button"
          onClick={onResetNorth}
          aria-label="Reset map orientation to North"
          title="Reset North"
          className="flex h-10 w-10 items-center justify-center bg-canvas text-ink hover:bg-surface"
        >
          <span
            className="inline-flex transition-transform duration-150"
            style={{ transform: `rotate(${-Math.round(bearing)}deg)` }}
          >
            <Icon icon={Compass} size={17} className={Math.abs(bearing) > 2 ? "text-live" : "text-ink"} />
          </span>
        </button>

        <button
          type="button"
          onClick={onRecenter}
          aria-label="Recenter map"
          title="Recenter"
          className="flex h-10 w-10 items-center justify-center bg-canvas text-ink hover:bg-surface"
        >
          <Icon icon={LocateFixed} size={17} />
        </button>
      </div>

      <div className="hidden sm:flex flex-col overflow-hidden rounded-lg border border-line bg-canvas divide-y divide-line">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
          className="flex h-9 w-10 items-center justify-center bg-canvas text-ink hover:bg-surface"
        >
          <Icon icon={Plus} size={16} />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
          className="flex h-9 w-10 items-center justify-center bg-canvas text-ink hover:bg-surface"
        >
          <Icon icon={Minus} size={16} />
        </button>
      </div>
    </div>
  );
}
