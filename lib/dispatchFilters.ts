import { isActiveTripPhase } from "@/lib/tripMachine";
import type { CityId, Tier, Trip, Vehicle, VehicleStatus, VehicleStatusFilter } from "@/types/fleet";

const STATUS_PRIORITY: Record<VehicleStatus, number> = {
  alert: 0,
  on_trip: 1,
  enroute_pickup: 2,
  idle: 3,
  offline: 4,
};

function matchesStatusFilter(vehicle: Vehicle, statusFilter: VehicleStatusFilter): boolean {
  switch (statusFilter) {
    case "all":
      return true;
    case "on_trip":
      return vehicle.status === "on_trip" || vehicle.status === "enroute_pickup";
    case "idle":
      return vehicle.status === "idle";
    case "alert":
      return vehicle.status === "alert" || Boolean(vehicle.flagged);
  }
}

/**
 * Filters and sorts fleet units for the `/dispatch` sidebar.
 * Priority: flagged alerts first, then active trips, arriving units, idle, and offline.
 */
export function filterFleetVehicles(
  vehicles: ReadonlyArray<Vehicle>,
  tierFilter: "all" | Tier,
  query: string,
  statusFilter: VehicleStatusFilter = "all",
): Vehicle[] {
  const q = query.trim().toLowerCase();

  return vehicles
    .filter((v) => {
      if (tierFilter !== "all" && v.tier !== tierFilter) return false;
      if (!matchesStatusFilter(v, statusFilter)) return false;
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

function csvCell(value: string | number | boolean | undefined): string {
  const str = value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports a clean RFC-4180 CSV snapshot of all fleet units and active trip assignments
 * for operational reporting in `/dispatch`.
 */
export function buildFleetTelemetryCsv(
  cityId: CityId,
  vehicles: ReadonlyArray<Vehicle>,
  trips: ReadonlyArray<Trip>,
): string {
  const tripById = new Map<string, Trip>();
  for (const t of trips) {
    tripById.set(t.id, t);
  }

  const header = [
    "city",
    "unit_id",
    "plate",
    "tier",
    "status",
    "driver_name",
    "driver_phone",
    "driver_rating",
    "speed_kmh",
    "bearing_deg",
    "lng",
    "lat",
    "nearest_landmark",
    "active_trip_id",
    "trip_phase",
    "fare_etb",
  ].join(",");

  const rows = vehicles.map((v) => {
    const trip = v.tripId ? tripById.get(v.tripId) : undefined;
    return [
      csvCell(cityId),
      csvCell(v.id),
      csvCell(v.plate),
      csvCell(v.tier),
      csvCell(v.status),
      csvCell(v.driver.name),
      csvCell(v.driver.phone),
      csvCell(v.driver.rating.toFixed(2)),
      csvCell(v.speedKmh),
      csvCell(Math.round(v.bearing)),
      csvCell(v.position[0].toFixed(6)),
      csvCell(v.position[1].toFixed(6)),
      csvCell(v.landmark),
      csvCell(trip?.id ?? ""),
      csvCell(trip?.phase ?? ""),
      csvCell(trip ? trip.fareEtb : ""),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
