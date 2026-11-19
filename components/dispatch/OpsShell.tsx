"use client";

import { useMemo } from "react";
import { FleetSidebar } from "@/components/dispatch/FleetSidebar";
import { Inspector } from "@/components/dispatch/Inspector";
import { KpiStrip } from "@/components/dispatch/KpiStrip";
import { OpsTopBar } from "@/components/dispatch/OpsTopBar";
import { ClientMap } from "@/components/map/ClientMap";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Switch } from "@/components/ui/Switch";
import { getStrings } from "@/lib/i18n";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Full-viewport (`100vh`, zero page scroll) Ops Command Center at `/dispatch`.
 * Shares the exact same Zustand fleet store & simulator as `/`.
 */
export function OpsShell() {
  const locale = useFleetStore((s) => s.locale);
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const sidebarCollapsed = useFleetStore((s) => s.sidebarCollapsed);
  const trafficEnabled = useFleetStore((s) => s.trafficEnabled);
  const setTrafficEnabled = useFleetStore((s) => s.setTrafficEnabled);

  const s = getStrings(locale);

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : undefined),
    [vehicles, selectedVehicleId],
  );

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-surface">
      <OpsTopBar />

      {/* Compact KPI sub-strip for <1280px screens */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas px-3 py-1.5 xl:hidden">
        <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <KpiStrip />
        </div>
        <HydrationGate fallback={null}>
          <div className="sm:hidden shrink-0">
            <Switch
              size="sm"
              tone="live"
              checked={trafficEnabled}
              onChange={setTrafficEnabled}
              label={s.trafficShort}
            />
          </div>
        </HydrationGate>
      </div>

      {/* Main 3-column workspace: [320px FleetSidebar | MapLibre 3D | 340px Inspector] */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <div className="absolute inset-y-0 left-0 z-20 flex h-full md:static md:z-auto">
            <FleetSidebar />
          </div>
        )}

        <section
          aria-label="Live fleet geospatial map"
          className="relative h-full min-w-0 flex-1 overflow-hidden"
        >
          <ClientMap
            variant="dispatch"
            showAllTrips
            followVehicleId={selectedVehicleId}
            onVehicleClick={(id) => selectVehicle(id)}
            controlsClassName="top-3"
          />
        </section>

        {selectedVehicle && (
          <div className="absolute inset-y-0 right-0 z-30 flex h-full w-full max-w-[340px] md:static md:z-auto md:w-[340px] md:shrink-0">
            <Inspector vehicle={selectedVehicle} />
          </div>
        )}
      </div>
    </main>
  );
}
