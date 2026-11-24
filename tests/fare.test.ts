import { describe, expect, it } from "vitest";
import { breakdownFare, estimateTravelMinutes, lockedFare, quoteAllTiers } from "@/lib/fare";
import { TIERS } from "@/lib/tiers";

describe("lockedFare & quoteAllTiers", () => {
  it("is 100% deterministic for any given tier and distance", () => {
    for (const d of [0, 0.5, 1.8, 3.4, 7.25, 14.6]) {
      expect(lockedFare("bajaj", d)).toBe(lockedFare("bajaj", d));
      expect(lockedFare("economy", d)).toBe(lockedFare("economy", d));
      expect(lockedFare("minivan", d)).toBe(lockedFare("minivan", d));
      expect(lockedFare("cargo", d)).toBe(lockedFare("cargo", d));
    }
  });

  it("enforces tier minimum fares and 5-ETB rounding steps", () => {
    expect(lockedFare("bajaj", 0)).toBe(TIERS.bajaj.minimumEtb);
    expect(lockedFare("economy", 0.1)).toBe(TIERS.economy.minimumEtb);
    expect(lockedFare("minivan", 0.2)).toBe(TIERS.minivan.minimumEtb);
    expect(lockedFare("cargo", 0.2)).toBe(TIERS.cargo.minimumEtb);

    for (let km = 0.5; km <= 20; km += 0.35) {
      expect(lockedFare("bajaj", km) % 5).toBe(0);
      expect(lockedFare("economy", km) % 5).toBe(0);
      expect(lockedFare("minivan", km) % 5).toBe(0);
      expect(lockedFare("cargo", km) % 5).toBe(0);
    }
  });

  it("maintains strict tier ordering Bajaj < Economy < Minivan < Cargo", () => {
    for (const km of [1, 2.5, 4.2, 8.0, 15.0]) {
      const b = lockedFare("bajaj", km);
      const e = lockedFare("economy", km);
      const m = lockedFare("minivan", km);
      const c = lockedFare("cargo", km);
      expect(b).toBeLessThan(e);
      expect(e).toBeLessThan(m);
      expect(m).toBeLessThan(c);
    }
  });

  it("returns quotes across all 4 tiers with positive ETAs", () => {
    const quotes = quoteAllTiers(4.1);
    expect(Object.keys(quotes)).toEqual(["bajaj", "economy", "minivan", "cargo"]);
    expect(quotes.bajaj.etaMinutes).toBeGreaterThanOrEqual(2);
    expect(estimateTravelMinutes("bajaj", 0)).toBe(2);
  });

  it("computes itemized upfront fare breakdowns matching lockedFare totals", () => {
    const shortRide = breakdownFare("economy", 0.2);
    expect(shortRide.minimumApplied).toBe(true);
    expect(shortRide.totalEtb).toBe(lockedFare("economy", 0.2));

    const cityRide = breakdownFare("bajaj", 5.2);
    expect(cityRide.baseEtb).toBe(TIERS.bajaj.baseEtb);
    expect(cityRide.distanceEtb).toBeGreaterThan(0);
    expect(cityRide.timeEtb).toBeGreaterThan(0);
    expect(cityRide.totalEtb).toBe(lockedFare("bajaj", 5.2));
  });
});
