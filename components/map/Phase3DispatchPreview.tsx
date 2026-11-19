"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClientMap } from "@/components/map/ClientMap";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { StatusDot, type DotTone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { TIERS } from "@/lib/tiers";
import { useFleetStore } from "@/store/useFleetStore";
import type { CityId, VehicleStatus } from "@/types/fleet";

const CITY_OPTIONS = CITY_ORDER.map((id) => ({
  value: id,
  label: CITIES[id].name,
}));

function dotForStatus(status: VehicleStatus): DotTone {
  switch (status) {
    case "on_trip":
      return "live";
    case "enroute_pickup":
      return "warn";
    case "alert":
      return "danger";
    case "offline":
    case "idle":
      return "idle";
  }
}

/**
 * Phase 3 live 3D geospatial preview for `/dispatch`.
 * Phase 5 expands this into the full Ops Command Center with KPIs, filters & Inspector.
 */
export function Phase3DispatchPreview() {
  const cityId = useFleetStore((s) => s.cityId);
  const setCity = useFleetStore((s) => s.setCity);
  const vehicles = useFleetStore((s) => s.vehicles);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);
  const kpis = useFleetStore((s) => s.kpis);
  const map3dEnabled = useFleetStore((s) => s.map3dEnabled);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-canvas px-4">
        <div className="flex items-center gap-3">
          <Wordmark suffix="Ops" />
          <Select<CityId>
            label="City"
            size="sm"
            value={cityId}
            onChange={setCity}
            options={CITY_OPTIONS}
            className="w-[136px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <HydrationGate fallback={<span className="num text-[12px] text-muted">20 units</span>}>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <StatusDot tone="live" pulse size={6} />
              <span className="num">
                {kpis.activeFleet}/{kpis.totalFleet} active · {kpis.tripsInProgress} trips
              </span>
              <Badge mono>{map3dEnabled ? "3D" : "2D"}</Badge>
            </span>
          </HydrationGate>
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink hover:bg-surface"
          >
            <Icon icon={Smartphone} size={14} />
            Mobile App →
          </Link>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
        <aside className="hidden h-full flex-col overflow-hidden border-r border-line bg-canvas md:flex">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
              Live Fleet ({CITIES[cityId].name})
            </span>
            {selectedVehicleId && (
              <button
                type="button"
                onClick={() => selectVehicle(null)}
                className="text-[12px] font-medium text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
          <div className="scroll-y flex-1 divide-y divide-line">
            <HydrationGate
              fallback={
                <p className="p-4 text-[12px] text-muted">Connecting to fleet telemetry…</p>
              }
            >
              {vehicles.map((vehicle) => {
                const selected = vehicle.id === selectedVehicleId;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => selectVehicle(selected ? null : vehicle.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                      selected ? "bg-surface" : "hover:bg-surface",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <StatusDot tone={dotForStatus(vehicle.status)} size={6} />
                        <span className="num font-mono text-[12px] font-semibold text-ink">
                          {vehicle.id}
                        </span>
                        <Badge>{TIERS[vehicle.tier].name}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {vehicle.landmark} · {vehicle.driver.name}
                      </p>
                    </div>
                    <span className="num text-[12px] font-medium text-muted">
                      {vehicle.speedKmh} km/h
                    </span>
                  </button>
                );
              })}
            </HydrationGate>
          </div>
        </aside>

        <div className="relative h-full w-full overflow-hidden">
          <ClientMap
            variant="dispatch"
            showAllTrips
            followVehicleId={selectedVehicleId}
            onVehicleClick={(id) => selectVehicle(id)}
            controlsClassName="top-3"
          />
        </div>
      </section>
    </main>
  );
}
