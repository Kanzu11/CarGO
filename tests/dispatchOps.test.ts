import { beforeEach, describe, expect, it } from "vitest";
import { CITIES } from "@/lib/cities";
import {
  buildFleetTelemetryCsv,
  filterActiveTrips,
  filterFleetVehicles,
  formatClockTime,
} from "@/lib/dispatchFilters";
import { FleetSimulator } from "@/lib/fleetSimulator";
import { useFleetStore } from "@/store/useFleetStore";

describe("Phase 5 Dispatch Ops filters & store actions", () => {
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
      selectedVehicleId: null,
      tierFilter: "all",
      searchQuery: "",
      trafficEnabled: true,
    });
  });

  it("filters vehicles by tier & search and orders alerts/active units first", () => {
    const sim = new FleetSimulator("adama");
    const snap = sim.getSnapshot();
    const first = snap.vehicles[0]!;

    sim.handleClientMessage({ type: "ops.flag", vehicleId: first.id, flagged: true });
    const updatedSnap = sim.getSnapshot();

    const bajajOnly = filterFleetVehicles(updatedSnap.vehicles, "bajaj", "");
    expect(bajajOnly).toHaveLength(7);
    expect(bajajOnly[0]?.id).toBe(first.id);
    expect(bajajOnly[0]?.status).toBe("alert");

    const byPlate = filterFleetVehicles(updatedSnap.vehicles, "all", first.plate);
    expect(byPlate.some((v) => v.id === first.id)).toBe(true);

    const activeTrips = filterActiveTrips(updatedSnap.trips, "all", "");
    expect(activeTrips.length).toBeGreaterThanOrEqual(4);

    // Status filter pills (alert, on_trip, idle)
    const alertsOnly = filterFleetVehicles(updatedSnap.vehicles, "all", "", "alert");
    expect(alertsOnly).toHaveLength(1);
    expect(alertsOnly[0]?.id).toBe(first.id);

    const idleOnly = filterFleetVehicles(updatedSnap.vehicles, "all", "", "idle");
    expect(idleOnly.every((v) => v.status === "idle")).toBe(true);

    // CSV telemetry export
    const csv = buildFleetTelemetryCsv("adama", updatedSnap.vehicles, updatedSnap.trips);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(21);
    expect(lines[0]).toContain("city,unit_id,plate,tier,status");
    expect(lines[1]).toContain("adama,");
  });

  it("formats timeline clock times consistently", () => {
    const d = new Date(2026, 5, 1, 9, 4, 7);
    expect(formatClockTime(d.getTime())).toBe("09:04:07");
  });

  it("supports Reassign Driver, Send Landmark Note, Flag Alert & Traffic pause via store", () => {
    const sim = new FleetSimulator("adama");
    let now = 1_700_000_000_000;

    useFleetStore.getState().bindTransportSend((msg) => sim.handleClientMessage(msg, now));
    const unsub = sim.subscribe((msg) => useFleetStore.getState().applyServerMessage(msg));

    const snap = sim.getSnapshot(now);
    const activeTrip = snap.trips.find((t) => t.vehicleId);
    expect(activeTrip).toBeDefined();

    const originalVehicleId = activeTrip!.vehicleId!;
    useFleetStore.getState().selectVehicle(originalVehicleId);

    // 1. Send landmark note
    now += 1000;
    useFleetStore.getState().opsSendLandmarkNote(activeTrip!.id, "Meet beside CBE ATM");
    const afterNote = useFleetStore.getState().trips.find((t) => t.id === activeTrip!.id);
    expect(afterNote?.landmarkNote).toBe("Meet beside CBE ATM");

    // 2. Reassign Driver updates vehicle & follows newly assigned unit
    now += 1000;
    useFleetStore.getState().opsReassignDriver(activeTrip!.id);
    const afterReassign = useFleetStore.getState().trips.find((t) => t.id === activeTrip!.id);
    expect(afterReassign?.vehicleId).toBeDefined();
    expect(afterReassign?.vehicleId).not.toBe(originalVehicleId);
    expect(useFleetStore.getState().selectedVehicleId).toBe(afterReassign!.vehicleId);

    // 3. Flag & clear alert on vehicle
    now += 1000;
    const targetId = afterReassign!.vehicleId!;
    useFleetStore.getState().opsToggleFlagVehicle(targetId);
    expect(useFleetStore.getState().vehicles.find((v) => v.id === targetId)?.status).toBe("alert");

    useFleetStore.getState().opsToggleFlagVehicle(targetId);
    expect(useFleetStore.getState().vehicles.find((v) => v.id === targetId)?.flagged).toBe(false);

    // 4. Pause traffic simulation -> idle vehicles stop moving
    useFleetStore.getState().setTrafficEnabled(false);
    const idleVehicle = useFleetStore.getState().vehicles.find((v) => !v.tripId)!;
    const posBefore = idleVehicle.position;
    sim.step((now += 1000));
    const posAfter = useFleetStore
      .getState()
      .vehicles.find((v) => v.id === idleVehicle.id)!.position;
    expect(posAfter).toEqual(posBefore);
    expect(CITIES.adama.landmarks.length).toBeGreaterThanOrEqual(6);

    unsub();
  });
});
