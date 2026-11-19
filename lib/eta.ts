import { clamp, haversineKm } from "@/lib/geo";
import { TIERS } from "@/lib/tiers";
import type { LngLat, PaymentMethod, Tier, Vehicle } from "@/types/fleet";

/**
 * Estimates arrival time (in whole minutes, clamped to 2..18 min) for the nearest
 * available vehicle of a given tier relative to the rider pickup coordinate.
 */
export function estimateNearestTierEtaMin(
  tier: Tier,
  pickup: LngLat,
  vehicles: ReadonlyArray<Vehicle>,
): number {
  const tierVehicles = vehicles.filter((v) => v.tier === tier && v.status !== "offline");
  const idlePool = tierVehicles.filter((v) => v.status === "idle" && !v.tripId);
  const pool = idlePool.length > 0 ? idlePool : tierVehicles;

  if (pool.length === 0) {
    return tier === "bajaj" ? 4 : tier === "economy" ? 5 : 7;
  }

  let minDistKm = Infinity;
  for (const v of pool) {
    const d = haversineKm(v.position, pickup);
    if (d < minDistKm) {
      minDistKm = d;
    }
  }

  const urbanSpeedKmh = TIERS[tier].avgSpeedKmh * 0.85;
  const minutes = Math.round((minDistKm / urbanSpeedKmh) * 60 + (idlePool.length > 0 ? 1 : 3));
  return clamp(minutes, 2, 18);
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "telebirr":
      return "Telebirr";
    case "cbe_birr":
      return "CBE Birr";
  }
}

export function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CG";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
