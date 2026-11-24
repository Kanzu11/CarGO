import { TIERS, TIER_ORDER } from "@/lib/tiers";
import type { Tier } from "@/types/fleet";

export interface FareQuote {
  tier: Tier;
  distanceKm: number;
  etaMinutes: number;
  fareEtb: number;
}

export interface FareBreakdown {
  baseEtb: number;
  distanceEtb: number;
  timeEtb: number;
  minimumApplied: boolean;
  totalEtb: number;
}

/**
 * Itemized breakdown of a locked upfront ETB fare (base + distance + estimated time).
 */
export function breakdownFare(tier: Tier, distanceKm: number): FareBreakdown {
  const meta = TIERS[tier];
  const safeDistance = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  const minutes = (safeDistance / meta.avgSpeedKmh) * 60;
  const baseEtb = meta.baseEtb;
  const distanceEtb = Math.round(meta.perKmEtb * safeDistance);
  const timeEtb = Math.round(meta.perMinEtb * minutes);
  const rawRounded = Math.round((meta.baseEtb + meta.perKmEtb * safeDistance + meta.perMinEtb * minutes) / 5) * 5;
  const totalEtb = Math.max(meta.minimumEtb, rawRounded);
  return {
    baseEtb,
    distanceEtb,
    timeEtb,
    minimumApplied: totalEtb > rawRounded,
    totalEtb,
  };
}

/**
 * Deterministic upfront locked ETB fare calculator.
 * Rounded to the nearest 5 ETB and clamped to the tier minimum so riders and
 * drivers see a clear, zero-haggling price.
 */
export function lockedFare(tier: Tier, distanceKm: number): number {
  const meta = TIERS[tier];
  const safeDistance = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  const minutes = (safeDistance / meta.avgSpeedKmh) * 60;
  const raw = meta.baseEtb + meta.perKmEtb * safeDistance + meta.perMinEtb * minutes;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(meta.minimumEtb, rounded);
}

/** Real-world travel time in whole minutes for a given tier and distance. */
export function estimateTravelMinutes(tier: Tier, distanceKm: number): number {
  const meta = TIERS[tier];
  const safeDistance = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  const minutes = (safeDistance / meta.avgSpeedKmh) * 60;
  return Math.max(2, Math.round(minutes));
}

/** Computes upfront quotes across all 4 Ethiopian vehicle tiers. */
export function quoteAllTiers(distanceKm: number): Record<Tier, FareQuote> {
  const quotes = {} as Record<Tier, FareQuote>;
  for (const tier of TIER_ORDER) {
    quotes[tier] = {
      tier,
      distanceKm: Number(distanceKm.toFixed(2)),
      etaMinutes: estimateTravelMinutes(tier, distanceKm),
      fareEtb: lockedFare(tier, distanceKm),
    };
  }
  return quotes;
}
