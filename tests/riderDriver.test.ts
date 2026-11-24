import { beforeEach, describe, expect, it } from "vitest";
import { CITIES } from "@/lib/cities";
import { driverInitials, estimateNearestTierEtaMin, paymentMethodLabel } from "@/lib/eta";
import { FleetSimulator } from "@/lib/fleetSimulator";
import { searchLocalPlaces } from "@/lib/placeSearch";
import { useFleetStore } from "@/store/useFleetStore";

describe("Phase 4 Rider & Driver helpers + store flows", () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => memory.set(k, v),
        removeItem: (k: string) => memory.delete(k),
        clear: () => memory.clear(),
      },
    });
    useFleetStore.setState({
      cityId: "adama",
      mode: "rider",
      riderStep: "location",
      pickup: CITIES.adama.landmarks[0]!,
      destination: CITIES.adama.landmarks[1]!,
      pickingTarget: "pickup",
      landmarkChip: "Main Gate",
      customLandmarkNote: "",
      selectedTier: "bajaj",
      paymentMethod: "telebirr",
      activeRiderTripId: null,
      persistedRiderTrip: null,
      driverOnline: false,
      driverEarningsEtb: 640,
      driverTripsCompleted: 6,
      driverOffer: null,
      activeDriverTripId: null,
    });
  });

  it("formats initials, payment labels, and nearest tier ETAs reliably", () => {
    expect(driverInitials("Abebe Kebede")).toBe("AK");
    expect(driverInitials("Yonas")).toBe("YO");
    expect(paymentMethodLabel("telebirr")).toBe("Telebirr");
    expect(paymentMethodLabel("cbe_birr")).toBe("CBE Birr");
    expect(paymentMethodLabel("cash")).toBe("Cash");

    const sim = new FleetSimulator("adama");
    const snap = sim.getSnapshot();
    const eta = estimateNearestTierEtaMin("bajaj", CITIES.adama.center, snap.vehicles);
    expect(eta).toBeGreaterThanOrEqual(2);
    expect(eta).toBeLessThanOrEqual(18);
  });

  it("runs a full Rider booking lifecycle and resets cleanly without tick re-attach", () => {
    const sim = new FleetSimulator("adama");
    const store = useFleetStore.getState();
    store.bindTransportSend((msg) => sim.handleClientMessage(msg, now));

    let now = 1_700_000_000_000;
    const unsub = sim.subscribe((msg) => useFleetStore.getState().applyServerMessage(msg));

    store.proceedToTierStep();
    expect(useFleetStore.getState().riderStep).toBe("tier");

    useFleetStore.getState().setSelectedTier("bajaj");
    useFleetStore.getState().setPaymentMethod("cbe_birr");
    useFleetStore.getState().setCustomLandmarkNote("In front of blue gate");
    useFleetStore.getState().confirmRiderBooking();

    expect(useFleetStore.getState().riderStep).toBe("trip");

    for (let i = 0; i < 60; i++) {
      now += 1000;
      sim.step(now);
      const state = useFleetStore.getState();
      const active = state.trips.find((t) => t.id === state.activeRiderTripId);
      if (active?.phase === "COMPLETED") break;
    }

    const completedState = useFleetStore.getState();
    const completedTrip = completedState.trips.find(
      (t) => t.id === completedState.activeRiderTripId,
    );
    expect(completedTrip?.phase).toBe("COMPLETED");
    expect(completedTrip?.payment).toBe("cbe_birr");

    // Rider taps Done -> returns to Step 1, records Recent Ride, and stays on Step 1
    useFleetStore.getState().completeAndResetRiderTrip(5);
    expect(useFleetStore.getState().riderStep).toBe("location");
    expect(useFleetStore.getState().activeRiderTripId).toBeNull();
    expect(useFleetStore.getState().recentRiderTrips).toHaveLength(1);
    expect(useFleetStore.getState().recentRiderTrips[0]?.id).toBe(completedTrip?.id);

    // Simulate async BroadcastChannel/server delivery of rated COMPLETED trip.updated
    useFleetStore.getState().applyServerMessage({
      type: "trip.updated",
      trip: { ...completedTrip!, rating: 5 },
    });
    expect(useFleetStore.getState().riderStep).toBe("location");
    expect(useFleetStore.getState().activeRiderTripId).toBeNull();

    sim.step((now += 1000));
    expect(useFleetStore.getState().riderStep).toBe("location");

    unsub();
  });

  it("runs Driver Mode: online -> offer after 3s -> Accept -> Arrived -> Start -> Complete credits ETB", () => {
    const sim = new FleetSimulator("adama");
    let now = 1_700_000_000_000;

    useFleetStore.getState().bindTransportSend((msg) => sim.handleClientMessage(msg, now));
    const unsub = sim.subscribe((msg) => useFleetStore.getState().applyServerMessage(msg));

    useFleetStore.getState().setMode("driver");
    useFleetStore.getState().setDriverOnline(true);

    for (let i = 0; i < 3; i++) {
      now += 1000;
      sim.step(now);
    }

    const offer = useFleetStore.getState().driverOffer;
    expect(offer).not.toBeNull();
    const expectedPayout = offer!.payoutEtb;

    useFleetStore.getState().acceptDriverJob();
    expect(useFleetStore.getState().activeDriverTripId).toBe(offer!.tripId);

    // Step 1: Arrived at Pickup
    now += 1000;
    useFleetStore.getState().advanceDriverJob();
    let trip = useFleetStore.getState().trips.find((t) => t.id === offer!.tripId);
    expect(trip?.phase).toBe("ARRIVING");

    // Step 2: Start Trip
    now += 1000;
    useFleetStore.getState().advanceDriverJob();
    trip = useFleetStore.getState().trips.find((t) => t.id === offer!.tripId);
    expect(trip?.phase).toBe("IN_PROGRESS");

    // Step 3: Complete Trip
    now += 1000;
    useFleetStore.getState().advanceDriverJob();
    const after = useFleetStore.getState();
    expect(after.activeDriverTripId).toBeNull();
    expect(after.driverTripsCompleted).toBe(7);
    expect(after.driverEarningsEtb).toBe(640 + expectedPayout);

    unsub();
  });

  it("switches cities instantaneously across Addis Ababa, Adama, Hawassa & Worabe without reload", () => {
    const sim = new FleetSimulator("addis");
    useFleetStore.getState().bindTransportSend((msg) => sim.handleClientMessage(msg, Date.now()));
    const unsub = sim.subscribe((msg) => useFleetStore.getState().applyServerMessage(msg));

    for (const targetCity of ["worabe", "adama", "hawassa", "addis"] as const) {
      useFleetStore.getState().setCity(targetCity);
      const state = useFleetStore.getState();
      expect(state.cityId).toBe(targetCity);
      expect(state.pickup.id).toBe(CITIES[targetCity].landmarks[0]!.id);
      expect(state.destination?.id).toBe(CITIES[targetCity].landmarks[1]!.id);
      expect(state.vehicles).toHaveLength(20);
      expect(state.vehicles[0]?.cityId).toBe(targetCity);
      expect(state.vehicles[0]?.plate.startsWith(CITIES[targetCity].platePrefix)).toBe(true);
    }

    unsub();
  });

  it("searches landmarks & neighborhoods bilingually, swaps stops, and sends quick pickup notes", () => {
    const enMatches = searchLocalPlaces("addis", "Kazanchis", "en");
    expect(enMatches[0]?.place.id).toBe("addis-kazanchis");

    const amMatches = searchLocalPlaces("addis", "ቦሌ", "am");
    expect(amMatches.length).toBeGreaterThanOrEqual(2);

    const hoodMatches = searchLocalPlaces("addis", "Sarbet", "en");
    expect(hoodMatches[0]?.place.id).toBe("addis-nb-sarbet");

    // Swap pickup <-> destination
    const origPickup = useFleetStore.getState().pickup;
    const origDest = useFleetStore.getState().destination!;
    useFleetStore.getState().swapPickupAndDestination();
    expect(useFleetStore.getState().pickup.id).toBe(origDest.id);
    expect(useFleetStore.getState().destination?.id).toBe(origPickup.id);

    // Quick pickup note updates live trip note
    const sim = new FleetSimulator("adama");
    const now = 1_700_000_000_000;
    useFleetStore.getState().bindTransportSend((msg) => sim.handleClientMessage(msg, now));
    const unsub = sim.subscribe((msg) => useFleetStore.getState().applyServerMessage(msg));

    useFleetStore.getState().confirmRiderBooking();
    useFleetStore.getState().sendRiderQuickNote("At main gate");
    const active = useFleetStore
      .getState()
      .trips.find((t) => t.id === useFleetStore.getState().activeRiderTripId);
    expect(active?.landmarkNote).toBe("At main gate");

    unsub();
  });
});
