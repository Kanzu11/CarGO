"use client";

import { useEffect, useMemo } from "react";
import { FleetSidebar } from "@/components/dispatch/FleetSidebar";
import { Inspector } from "@/components/dispatch/Inspector";
import { OpsTopBar } from "@/components/dispatch/OpsTopBar";
import { ClientMap } from "@/components/map/ClientMap";
import { useFleetStore } from "@/store/useFleetStore";

/**
 * Full-viewport (`100vh`, zero page scroll) Ops Command Center at `/dispatch`.
 * Shares the exact same Zustand fleet store & simulator as `/`.
 */
export function OpsShell() {
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const sidebarCollapsed = useFleetStore((s) => s.sidebarCollapsed);

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) : undefined),
    [vehicles, selectedVehicleId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedVehicleId) {
        selectVehicle(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedVehicleId, selectVehicle]);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-surface">
      <OpsTopBar />

      {/* Main 3-column workspace: [320px FleetSidebar | Hybrid Satellite Map | 340px Inspector] */}
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
