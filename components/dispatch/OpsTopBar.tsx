"use client";

import Link from "next/link";
import { Download, PanelLeftClose, PanelLeftOpen, Smartphone } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { KpiStrip } from "@/components/dispatch/KpiStrip";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Icon } from "@/components/ui/Icon";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { CITY_ORDER } from "@/lib/cities";
import { buildFleetTelemetryCsv } from "@/lib/dispatchFilters";
import { getStrings, localizeCityName } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";
import { toast } from "@/store/useToastStore";
import type { CityId } from "@/types/fleet";

/**
 * 48px Ops Command Center header: sidebar toggle, CarGo Ops wordmark,
 * city switcher, desktop live KPI telemetry strip, CSV export, Simulate Traffic,
 * EN/አማ language toggle, and Mobile App link back to `/`.
 */
export function OpsTopBar() {
  const cityId = useFleetStore((s) => s.cityId);
  const setCity = useFleetStore((s) => s.setCity);
  const locale = useFleetStore((s) => s.locale);
  const vehicles = useFleetStore((s) => s.vehicles);
  const trips = useFleetStore((s) => s.trips);
  const trafficEnabled = useFleetStore((s) => s.trafficEnabled);
  const setTrafficEnabled = useFleetStore((s) => s.setTrafficEnabled);
  const sidebarCollapsed = useFleetStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useFleetStore((s) => s.setSidebarCollapsed);

  const s = getStrings(locale);

  const cityOptions = useMemo(
    () =>
      CITY_ORDER.map((id) => ({
        value: id,
        label: localizeCityName(id, locale),
      })),
    [locale],
  );

  const handleExportCsv = useCallback(() => {
    const csv = buildFleetTelemetryCsv(cityId, vehicles, trips);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cargo-telemetry-${cityId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`Exported ${vehicles.length} fleet units (${cityId.toUpperCase()})`, {
      tone: "live",
    });
  }, [cityId, vehicles, trips]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-canvas px-3">
      {/* Left: sidebar toggle, CarGo Ops wordmark, City switcher */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand fleet sidebar" : "Collapse fleet sidebar"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink hover:bg-surface"
        >
          <Icon icon={sidebarCollapsed ? PanelLeftOpen : PanelLeftClose} size={15} />
        </button>

        <HydrationGate fallback={<Wordmark suffix="Ops" />}>
          <Wordmark suffix={s.opsSuffix} />
        </HydrationGate>

        <HydrationGate
          fallback={
            <span className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink">
              Addis Ababa
            </span>
          }
        >
          <Select<CityId>
            label="Operations city"
            size="sm"
            value={cityId}
            onChange={setCity}
            options={cityOptions}
            className="w-[116px] sm:w-[132px]"
          />
        </HydrationGate>
      </div>

      {/* Center: Desktop live KPI strip */}
      <KpiStrip className="hidden xl:inline-flex" />

      {/* Right: CSV export, Simulate Traffic switch, LocaleToggle, and Mobile App link */}
      <div className="flex shrink-0 items-center gap-2">
        <HydrationGate fallback={null}>
          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export telemetry CSV"
            title="Export telemetry CSV"
            className="hidden sm:inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 text-[12px] font-medium text-ink hover:bg-surface"
          >
            <Icon icon={Download} size={13} />
            <span>{s.exportCsv}</span>
          </button>

          <Switch
            size="sm"
            tone="live"
            checked={trafficEnabled}
            onChange={setTrafficEnabled}
            label={s.simulateTraffic}
          />
        </HydrationGate>

        <LocaleToggle />

        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-[13px] font-medium text-ink hover:bg-surface"
        >
          <Icon icon={Smartphone} size={14} />
          <span className="hidden sm:inline">{s.mobileApp}</span>
          <span className="sm:hidden">{s.mobileAppShort}</span>
        </Link>
      </div>
    </header>
  );
}
