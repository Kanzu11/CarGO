import { describe, expect, it } from "vitest";
import { CITIES } from "@/lib/cities";
import { canTransitionTrip, isActiveTripPhase, transitionTrip } from "@/lib/tripMachine";
import type { Trip } from "@/types/fleet";

function makeDummyTrip(): Trip {
  const city = CITIES.adama;
  return {
    id: "TRP-TEST-1",
    cityId: "adama",
    tier: "bajaj",
    phase: "REQUESTED",
    pickup: city.landmarks[0]!,
    dropoff: city.landmarks[1]!,
    route: [city.landmarks[0]!.coords, city.landmarks[1]!.coords],
    distanceKm: 3.2,
    etaMinutes: 7,
    fareEtb: 85,
    payment: "telebirr",
    source: "rider",
    createdAt: 1000,
    updatedAt: 1000,
    progress: 0,
    remainingKm: 3.2,
    remainingEtaMin: 7,
    timeline: [{ phase: "REQUESTED", at: 1000 }],
  };
}

describe("trip state machine", () => {
  it("walks the full rider lifecycle cleanly", () => {
    let trip = makeDummyTrip();
    trip = transitionTrip(trip, "SEARCHING", 2000, "Scanning");
    trip = transitionTrip(trip, "DRIVER_ASSIGNED", 3000, "Assigned");
    trip = transitionTrip(trip, "ARRIVING", 4000, "En route");
    trip = transitionTrip(trip, "IN_PROGRESS", 5000, "Picked up");
    expect(isActiveTripPhase(trip.phase)).toBe(true);
    trip = transitionTrip(trip, "COMPLETED", 6000, "Dropped off");
    expect(trip.phase).toBe("COMPLETED");
    expect(isActiveTripPhase(trip.phase)).toBe(false);
    expect(trip.timeline).toHaveLength(6);
  });

  it("rejects illegal phase transitions", () => {
    const trip = makeDummyTrip();
    expect(canTransitionTrip("REQUESTED", "COMPLETED")).toBe(false);
    expect(() => transitionTrip(trip, "COMPLETED", 2000)).toThrow(/Illegal trip phase transition/);
  });
});
