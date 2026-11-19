"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Smartphone } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { KpiStrip } from "@/components/dispatch/KpiStrip";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { Switch } from "@/components/ui/Switch";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId, ConnStatus } from "@/types/fleet";

const CITY_OPTIONS = CITY_ORDER.map((id) => ({
  value: id,
  label: CITIES[id].name,
}));

function wsTone(status: ConnStatus): DotTone {
  switch (status) {
    case "connected":
      return "live";
    case "reconnecting":
      return "warn";
    case "offline":
      return "danger";
  }
}

/**
 * 48px Ops Command Center header with city switcher, KPI strip, Simulate Traffic toggle,
 * WebSocket status dot, and Mobile App link back to `/`.
 */
export function OpsTopBar() {
  const cityId = useFleetStore((s) => s.cityId);
  const setCity = useFleetStore((s) => s.setCity);
  const trafficEnabled = useFleetStore((s) => s.trafficEnabled);
  const setTrafficEnabled = useFleetStore((s) => s.setTrafficEnabled);
  const connStatus = useFleetStore((s) => s.connStatus);
  const sidebarCollapsed = useFleetStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useFleetStore((s) => s.setSidebarCollapsed);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-canvas px-3">
      {/* Left: sidebar toggle, CarGo Ops wordmark, City switcher */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand fleet sidebar" : "Collapse fleet sidebar"}
          title={sidebarCollapsed ? "Show fleet sidebar" : "Hide fleet sidebar"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink hover:bg-surface"
        >
          <Icon icon={sidebarCollapsed ? PanelLeftOpen : PanelLeftClose} size={15} />
        </button>

        <Wordmark suffix="Ops" />

        <HydrationGate
          fallback={
            <span className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink">
              Adama
            </span>
          }
        >
          <Select<CityId>
            label="Operations city"
            size="sm"
            value={cityId}
            onChange={setCity}
            options={CITY_OPTIONS}
            className="w-[122px] sm:w-[132px]"
          />
        </HydrationGate>
      </div>

      {/* Center: compact live KPI strip on desktop */}
      <div className="hidden xl:flex">
        <KpiStrip />
      </div>

      {/* Right: Simulate Traffic toggle, WS dot, Mobile App link */}
      <div className="flex shrink-0 items-center gap-3">
        <HydrationGate fallback={null}>
          <div className="hidden sm:flex items-center">
            <Switch
              size="sm"
              tone="live"
              checked={trafficEnabled}
              onChange={setTrafficEnabled}
              label="Simulate Traffic"
            />
          </div>
        </HydrationGate>

        <span
          title={`Dispatch stream: ${connStatus}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink"
        >
          <StatusDot tone={wsTone(connStatus)} pulse={connStatus !== "offline"} size={6} />
          <span>WS</span>
        </span>

        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-[13px] font-medium text-ink hover:bg-surface"
        >
          <Icon icon={Smartphone} size={14} />
          <span className="hidden sm:inline">Mobile App →</span>
          <span className="sm:hidden">App →</span>
        </Link>
      </div>
    </header>
  );
}
