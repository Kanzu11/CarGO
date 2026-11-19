import { isActiveTripPhase } from "@/lib/tripMachine";
import type { Tier, Trip, Vehicle, VehicleStatus } from "@/types/fleet";

const STATUS_PRIORITY: Record<VehicleStatus, number> = {
  alert: 0,
  on_trip: 1,
  enroute_pickup: 2,
  idle: 3,
  offline: 4,
};

/**
 * Filters and sorts fleet units for the `/dispatch` sidebar.
 * Priority: flagged alerts first, then active trips, arriving units, idle, and offline.
 */
export function filterFleetVehicles(
  vehicles: ReadonlyArray<Vehicle>,
  tierFilter: "all" | Tier,
  query: string,
): Vehicle[] {
  const q = query.trim().toLowerCase();

  return vehicles
    .filter((v) => {
      if (tierFilter !== "all" && v.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        v.id.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.driver.name.toLowerCase().includes(q) ||
        v.landmark.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      const pDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (pDiff !== 0) return pDiff;
      return a.id.localeCompare(b.id);
    });
}

/**
 * Filters active (non-terminal) trips by tier & search string for the `/dispatch` sidebar.
 */
export function filterActiveTrips(
  trips: ReadonlyArray<Trip>,
  tierFilter: "all" | Tier,
  query: string,
): Trip[] {
  const q = query.trim().toLowerCase();

  return trips.filter((t) => {
    if (!isActiveTripPhase(t.phase)) return false;
    if (tierFilter !== "all" && t.tier !== tierFilter) return false;
    if (!q) return true;
    return (
      t.id.toLowerCase().includes(q) ||
      t.pickup.name.toLowerCase().includes(q) ||
      t.dropoff.name.toLowerCase().includes(q) ||
      (t.plate?.toLowerCase().includes(q) ?? false) ||
      (t.driver?.name.toLowerCase().includes(q) ?? false) ||
      (t.landmarkNote?.toLowerCase().includes(q) ?? false) ||
      (t.vehicleId?.toLowerCase().includes(q) ?? false)
    );
  });
}

/** Deterministic `HH:MM:SS` 24-hour clock formatter for trip timeline entries. */
export function formatClockTime(timestampMs: number): string {
  const d = new Date(timestampMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
