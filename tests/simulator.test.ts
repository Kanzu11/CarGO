import { describe, expect, it } from "vitest";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { FleetSimulator } from "@/lib/fleetSimulator";

describe("FleetSimulator", () => {
  it("spawns 20 vehicles across 4 Ethiopian tiers in every supported city", () => {
    for (const cityId of CITY_ORDER) {
      const sim = new FleetSimulator(cityId);
      const snap = sim.getSnapshot();
      expect(snap.vehicles).toHaveLength(20);
      expect(snap.vehicles.filter((v) => v.tier === "bajaj")).toHaveLength(7);
      expect(snap.vehicles.filter((v) => v.tier === "economy")).toHaveLength(7);
      expect(snap.vehicles.filter((v) => v.tier === "minivan")).toHaveLength(3);
      expect(snap.vehicles.filter((v) => v.tier === "cargo")).toHaveLength(3);
      for (const v of snap.vehicles) {
        expect(v.plate.startsWith(CITIES[cityId].platePrefix)).toBe(true);
      }
    }
  });

  it("drives a Rider trip from SEARCHING through COMPLETED", () => {
    const sim = new FleetSimulator("adama");
    const city = CITIES.adama;
    let now = 1_700_000_000_000;

    sim.handleClientMessage(
      {
        type: "trip.request",
        pickup: city.landmarks[0]!,
        dropoff: city.landmarks[1]!,
        tier: "bajaj",
        payment: "telebirr",
        landmarkChip: "Main Gate",
        landmarkNote: "In front of blue gate",
      },
      now,
    );

    const seenPhases = new Set<string>();
    for (let i = 0; i < 60; i++) {
      now += 1000;
      sim.step(now);
      const riderTrip = sim.getSnapshot(now).trips.find((t) => t.source === "rider");
      if (riderTrip) {
        seenPhases.add(riderTrip.phase);
        if (riderTrip.phase === "COMPLETED") break;
      }
    }

    expect(seenPhases.has("DRIVER_ASSIGNED")).toBe(true);
    expect(seenPhases.has("ARRIVING")).toBe(true);
    expect(seenPhases.has("IN_PROGRESS")).toBe(true);
    expect(seenPhases.has("COMPLETED")).toBe(true);
  });

  it("emits a Driver Mode job offer after 3 seconds online and completes through 3 steps", () => {
    const sim = new FleetSimulator("adama");
    let now = 1_700_000_000_000;

    sim.handleClientMessage({ type: "driver.online", online: true }, now);
    for (let i = 0; i < 3; i++) {
      now += 1000;
      sim.step(now);
    }

    const snapWithOffer = sim.getSnapshot(now);
    expect(snapWithOffer.driverOffer).not.toBeNull();
    const offer = snapWithOffer.driverOffer!;

    // Accept offer
    sim.handleClientMessage({ type: "job.accept", offerId: offer.id }, (now += 500));
    let driverTrip = sim.getSnapshot(now).trips.find((t) => t.id === offer.tripId)!;
    expect(driverTrip.phase).toBe("DRIVER_ASSIGNED");

    // Step 1: Arrived at Pickup
    sim.handleClientMessage({ type: "job.advance", tripId: offer.tripId }, (now += 1000));
    driverTrip = sim.getSnapshot(now).trips.find((t) => t.id === offer.tripId)!;
    expect(driverTrip.phase).toBe("ARRIVING");

    // Step 2: Start Trip
    sim.handleClientMessage({ type: "job.advance", tripId: offer.tripId }, (now += 1000));
    driverTrip = sim.getSnapshot(now).trips.find((t) => t.id === offer.tripId)!;
    expect(driverTrip.phase).toBe("IN_PROGRESS");

    // Step 3: Complete Trip
    sim.handleClientMessage({ type: "job.advance", tripId: offer.tripId }, (now += 1000));
    driverTrip = sim.getSnapshot(now).trips.find((t) => t.id === offer.tripId)!;
    expect(driverTrip.phase).toBe("COMPLETED");
  });
});
