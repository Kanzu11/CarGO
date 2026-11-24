import { beforeEach, describe, expect, it } from "vitest";
import { resolvePersonPinState } from "@/components/map/mapLayers";
import { CITIES } from "@/lib/cities";
import { useFleetStore } from "@/store/useFleetStore";
import type { LngLat, UserGeoPosition } from "@/types/fleet";

const ADDIS_GPS_COORDS: LngLat = [38.7636, 9.0108];
const ADDIS_SIM_COORDS: LngLat = [38.758, 9.025];
const OUT_OF_CITY_COORDS: LngLat = [37.45, 11.59];

function makeUserGeo(coords: LngLat, nearestCityId: "addis" | "worabe" = "addis", isWithinCity = true): UserGeoPosition {
  return {
    coords,
    accuracyM: 18,
    updatedAt: 1_700_000_000_000,
    nearestCityId,
    isWithinCity,
  };
}

describe("GPS & Simulation person pin synchronization", () => {
  beforeEach(() => {
    useFleetStore.setState({
      cityId: "addis",
      locationSource: "simulated",
      geoStatus: "idle",
      userGeo: null,
      riderStep: "location",
      pickup: CITIES.addis.landmarks[0]!,
      destination: CITIES.addis.landmarks[1]!,
      pickingTarget: "destination",
      activeRiderTripId: null,
      persistedRiderTrip: null,
    });
  });

  it("renders zero ghost GPS pins or accuracy rings when in simulated mode", () => {
    const state = resolvePersonPinState({
      locationSource: "simulated",
      userGeo: makeUserGeo(ADDIS_GPS_COORDS),
      pickupPin: ADDIS_SIM_COORDS,
      activeTripPhase: null,
    });

    expect(state).toEqual({
      pickupIsLiveGps: false,
      showAccuracyRing: false,
      showStandaloneUserPin: false,
    });
  });

  it("renders a single synced live GPS person pin without stacking when pickup matches userGeo", () => {
    const state = resolvePersonPinState({
      locationSource: "real",
      userGeo: makeUserGeo(ADDIS_GPS_COORDS),
      pickupPin: ADDIS_GPS_COORDS,
      activeTripPhase: null,
    });

    expect(state).toEqual({
      pickupIsLiveGps: true,
      showAccuracyRing: true,
      showStandaloneUserPin: false,
    });
  });

  it("renders a standalone GPS person pin when no pickup pin is shown (driver/dispatch)", () => {
    const state = resolvePersonPinState({
      locationSource: "real",
      userGeo: makeUserGeo(ADDIS_GPS_COORDS),
      pickupPin: null,
      activeTripPhase: null,
    });

    expect(state).toEqual({
      pickupIsLiveGps: false,
      showAccuracyRing: true,
      showStandaloneUserPin: true,
    });
  });

  it("renders a standalone GPS person pin when userGeo drifted more than 25m from pickupPin", () => {
    const drifted: LngLat = [ADDIS_GPS_COORDS[0] + 0.001, ADDIS_GPS_COORDS[1] + 0.001];
    const state = resolvePersonPinState({
      locationSource: "real",
      userGeo: makeUserGeo(drifted),
      pickupPin: ADDIS_GPS_COORDS,
      activeTripPhase: "ARRIVING",
    });

    expect(state).toEqual({
      pickupIsLiveGps: false,
      showAccuracyRing: true,
      showStandaloneUserPin: true,
    });
  });

  it("keeps simulated mode on background out-of-city GPS and activates real GPS on manual tap", () => {
    useFleetStore.getState().applyRealLocation(OUT_OF_CITY_COORDS, 20, true, false);
    expect(useFleetStore.getState().locationSource).toBe("simulated");
    expect(useFleetStore.getState().userGeo?.coords).toEqual(OUT_OF_CITY_COORDS);

    useFleetStore.getState().applyRealLocation(OUT_OF_CITY_COORDS, 20, true, true);
    expect(useFleetStore.getState().locationSource).toBe("real");
    expect(useFleetStore.getState().pickup.coords).toEqual(OUT_OF_CITY_COORDS);
  });

  it("switches to simulated mode and moves person pin when tapping custom pickup coordinates", () => {
    useFleetStore.getState().applyRealLocation(ADDIS_GPS_COORDS, 15, true, true);
    expect(useFleetStore.getState().locationSource).toBe("real");

    useFleetStore.getState().setPickupFromCoords(ADDIS_SIM_COORDS);
    expect(useFleetStore.getState().locationSource).toBe("simulated");
    expect(useFleetStore.getState().pickup.coords).toEqual(ADDIS_SIM_COORDS);
  });

  it("preserves in-city coords cleanly when switching GPS -> Sim and snaps back from out-of-city GPS", () => {
    useFleetStore.getState().applyRealLocation(ADDIS_GPS_COORDS, 15, true, true);
    expect(useFleetStore.getState().locationSource).toBe("real");

    useFleetStore.getState().setLocationSource("simulated");
    expect(useFleetStore.getState().locationSource).toBe("simulated");
    expect(useFleetStore.getState().pickup.coords).toEqual(ADDIS_GPS_COORDS);
    expect(useFleetStore.getState().pickup.name.startsWith("GPS")).toBe(false);

    useFleetStore.getState().applyRealLocation(OUT_OF_CITY_COORDS, 20, true, true);
    expect(useFleetStore.getState().locationSource).toBe("real");

    useFleetStore.getState().setLocationSource("simulated");
    expect(useFleetStore.getState().locationSource).toBe("simulated");
    expect(useFleetStore.getState().pickup.coords).toEqual(CITIES.addis.landmarks[0]!.coords);
  });

  it("resets cleanly to simulated default pickup when switching to a city outside GPS range", () => {
    useFleetStore.getState().applyRealLocation(ADDIS_GPS_COORDS, 15, true, true);
    expect(useFleetStore.getState().locationSource).toBe("real");

    useFleetStore.getState().setCity("worabe");
    expect(useFleetStore.getState().cityId).toBe("worabe");
    expect(useFleetStore.getState().locationSource).toBe("simulated");
    expect(useFleetStore.getState().pickup.coords).toEqual(CITIES.worabe.landmarks[0]!.coords);
  });
});
