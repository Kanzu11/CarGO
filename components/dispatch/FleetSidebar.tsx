"use client";

import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { TripRow } from "@/components/dispatch/TripRow";
import { VehicleRow } from "@/components/dispatch/VehicleRow";
import { HydrationGate } from "@/components/system/HydrationGate";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { filterActiveTrips, filterFleetVehicles } from "@/lib/dispatchFilters";
import { getStrings } from "@/lib/i18n";
import { isActiveTripPhase } from "@/lib/tripMachine";
import { useFleetStore } from "@/store/useFleetStore";
import type { Tier, VehicleStatusFilter } from "@/types/fleet";

/**
 * 320px collapsible left fleet sidebar for `/dispatch` with tier tabs,
 * live operational status filters, and instant search.
 */
export function FleetSidebar() {
  const locale = useFleetStore((s) => s.locale);
  const vehicles = useFleetStore((s) => s.vehicles);
  const trips = useFleetStore((s) => s.trips);
  const tierFilter = useFleetStore((s) => s.tierFilter);
  const setTierFilter = useFleetStore((s) => s.setTierFilter);
  const statusFilter = useFleetStore((s) => s.statusFilter);
  const setStatusFilter = useFleetStore((s) => s.setStatusFilter);
  const searchQuery = useFleetStore((s) => s.searchQuery);
  const setSearchQuery = useFleetStore((s) => s.setSearchQuery);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  const s = getStrings(locale);

  const tierTabs: ReadonlyArray<{ value: "all" | Tier; label: string }> = [
    { value: "all", label: s.tabAll },
    { value: "bajaj", label: s.tabBajaj },
    { value: "economy", label: s.tabSedan },
    { value: "minivan", label: s.tabVan },
    { value: "cargo", label: s.tabCargo },
  ];

  const statusTabs: ReadonlyArray<{ value: VehicleStatusFilter; label: string }> = [
    { value: "all", label: s.statusAll },
    { value: "on_trip", label: s.statusActive },
    { value: "idle", label: s.statusIdle },
    { value: "alert", label: s.statusAlert },
  ];

  const filteredVehicles = useMemo(
    () => filterFleetVehicles(vehicles, tierFilter, searchQuery, statusFilter),
    [vehicles, tierFilter, searchQuery, statusFilter],
  );

  const filteredTrips = useMemo(
    () => filterActiveTrips(trips, tierFilter, searchQuery),
    [trips, tierFilter, searchQuery],
  );

  const activeTripFareByVehicle = useMemo(() => {
    const map = new Map<string, number>();
    for (const trip of trips) {
      if (trip.vehicleId && isActiveTripPhase(trip.phase)) {
        map.set(trip.vehicleId, trip.fareEtb);
      }
    }
    return map;
  }, [trips]);

  return (
    <aside
      aria-label="Fleet directory"
      className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-r border-line bg-canvas"
    >
      <HydrationGate
        fallback={
          <div className="space-y-2 border-b border-line p-2.5">
            <div className="h-8 rounded-lg border border-line bg-surface" />
            <div className="h-7 rounded-lg border border-line bg-surface" />
            <div className="h-8 rounded-lg border border-line bg-surface" />
          </div>
        }
      >
        {/* Tier filter tabs + status pills + instant search */}
        <div className="shrink-0 space-y-2 border-b border-line p-2.5">
          <div
            role="tablist"
            aria-label="Filter fleet by vehicle tier"
            className="grid grid-cols-5 gap-0.5 rounded-lg border border-line bg-surface p-0.5"
          >
            {tierTabs.map((tab) => {
              const active = tab.value === tierFilter;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTierFilter(tab.value)}
                  className={cn(
                    "h-7 rounded-[6px] px-1 text-[11px] font-medium transition-colors",
                    active ? "bg-brand text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter fleet by operational status"
            className="grid grid-cols-4 gap-1"
          >
            {statusTabs.map((item) => {
              const active = item.value === statusFilter;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(item.value)}
                  className={cn(
                    "h-6 rounded-[6px] border px-1.5 text-[11px] font-medium transition-colors",
                    active
                      ? item.value === "alert"
                        ? "border-danger bg-danger text-white"
                        : "border-live bg-live text-white"
                      : "border-line bg-canvas text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Icon
              icon={Search}
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              aria-label={s.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={s.searchPlaceholder}
              className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-7 text-[12px] text-ink placeholder:text-muted focus:border-brand focus:bg-canvas focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
              >
                <Icon icon={X} size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable active trips & fleet list */}
        <div className="scroll-y flex-1">
          {/* Active Trips */}
          <div className="border-b border-line">
            <div className="flex items-center justify-between bg-surface px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {s.activeTrips}
              </span>
              <Badge className="num">{filteredTrips.length}</Badge>
            </div>
            {filteredTrips.length > 0 ? (
              <div className="divide-y divide-line">
                {filteredTrips.map((trip) => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    selected={Boolean(trip.vehicleId && trip.vehicleId === selectedVehicleId)}
                    onSelect={() => {
                      if (!trip.vehicleId) return;
                      selectVehicle(trip.vehicleId);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="px-3 py-2.5 text-[12px] text-muted">{s.noActiveTrips}</p>
            )}
          </div>

          {/* Fleet Units */}
          <div>
            <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {s.fleetUnits}
              </span>
              <Badge className="num">{filteredVehicles.length}</Badge>
            </div>

            {filteredVehicles.length > 0 ? (
              <div className="divide-y divide-line">
                {filteredVehicles.map((vehicle) => {
                  const selected = vehicle.id === selectedVehicleId;
                  return (
                    <VehicleRow
                      key={vehicle.id}
                      vehicle={vehicle}
                      activeFareEtb={activeTripFareByVehicle.get(vehicle.id)}
                      selected={selected}
                      onSelect={() => selectVehicle(selected ? null : vehicle.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 p-4 text-center">
                <p className="text-[12px] text-muted">{s.noFleetUnits}</p>
                {(tierFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTierFilter("all");
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                    className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-surface"
                  >
                    {s.resetFilters}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </HydrationGate>
    </aside>
  );
}
