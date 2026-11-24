import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CITIES, DEFAULT_CITY_ID, detectNearestSupportedCity, findNearestPlace } from "@/lib/cities";
import { haversineMeters } from "@/lib/geo";
import { isActiveTripPhase } from "@/lib/tripMachine";
import { toast } from "@/store/useToastStore";
import type {
  AppMode,
  CityId,
  ClientMessage,
  CompletedTripSummary,
  ConnStatus,
  DriverJobOffer,
  FleetKpis,
  GeoPermissionState,
  LandmarkChip,
  LngLat,
  Locale,
  LocationSource,
  MapStyleMode,
  PaymentMethod,
  Place,
  RiderStep,
  ServerMessage,
  Tier,
  Trip,
  UserGeoPosition,
  Vehicle,
  VehicleStatusFilter,
  VehicleTelemetryFrame,
} from "@/types/fleet";

/**
 * Transient 60fps telemetry frame map.
 * Updated on each 1 Hz tick and read directly by the requestAnimationFrame
 * map interpolator so 60fps vehicle motion causes zero React re-renders.
 */
const telemetryFrameBuffer = new Map<string, VehicleTelemetryFrame>();

export function getTelemetryFramesMap(): ReadonlyMap<string, VehicleTelemetryFrame> {
  return telemetryFrameBuffer;
}

let transportSendRef: ((message: ClientMessage) => void) | null = null;

function defaultPickupForCity(cityId: CityId): Place {
  return CITIES[cityId].landmarks[0]!;
}

function defaultDestinationForCity(cityId: CityId): Place {
  return CITIES[cityId].landmarks[1] ?? CITIES[cityId].landmarks[0]!;
}

function buildGpsPickupPlace(cityId: CityId, userGeo: UserGeoPosition): Place {
  const activeCity = userGeo.isWithinCity ? userGeo.nearestCityId : cityId;
  const nearest = findNearestPlace(activeCity, userGeo.coords);
  const label = userGeo.isWithinCity
    ? nearest.distanceMeters <= 120
      ? `GPS • ${nearest.place.name}`
      : `GPS • Near ${nearest.place.name} (${nearest.distanceMeters}m)`
    : `GPS • ${userGeo.coords[1].toFixed(4)}, ${userGeo.coords[0].toFixed(4)}`;

  return {
    id: `gps-pickup-${userGeo.updatedAt}`,
    name: label,
    neighborhood: userGeo.isWithinCity ? nearest.place.neighborhood : "Live GPS",
    tag: nearest.place.tag,
    coords: userGeo.coords,
    kind: "custom",
  };
}

const INITIAL_KPIS: FleetKpis = {
  activeFleet: 20,
  totalFleet: 20,
  tripsInProgress: 4,
  avgDispatchSec: 3.1,
  liveVolumeEtb: 2850,
  completedToday: 16,
};

export interface FleetStoreState {
  // City & UI state
  cityId: CityId;
  locale: Locale;
  mode: AppMode;
  map3dEnabled: boolean;
  mapStyleMode: MapStyleMode;
  locationSource: LocationSource;
  geoStatus: GeoPermissionState;
  userGeo: UserGeoPosition | null;
  connStatus: ConnStatus;
  trafficEnabled: boolean;
  selectedVehicleId: string | null;
  tierFilter: "all" | Tier;
  statusFilter: VehicleStatusFilter;
  searchQuery: string;
  sidebarCollapsed: boolean;

  // Live Fleet & Trips
  vehicles: Vehicle[];
  trips: Trip[];
  kpis: FleetKpis;

  // Rider flow state (/)
  riderStep: RiderStep;
  pickup: Place;
  destination: Place | null;
  pickingTarget: "pickup" | "destination";
  landmarkChip: LandmarkChip;
  customLandmarkNote: string;
  selectedTier: Tier;
  paymentMethod: PaymentMethod;
  activeRiderTripId: string | null;
  persistedRiderTrip: Trip | null;
  recentRiderTrips: CompletedTripSummary[];

  // Driver mode state (/)
  driverOnline: boolean;
  driverEarningsEtb: number;
  driverTripsCompleted: number;
  driverOffer: DriverJobOffer | null;
  activeDriverTripId: string | null;

  // Actions
  setCity: (cityId: CityId) => void;
  setLocale: (locale: Locale) => void;
  setMode: (mode: AppMode) => void;
  setMap3dEnabled: (enabled: boolean) => void;
  setMapStyleMode: (styleMode: MapStyleMode) => void;
  setLocationSource: (source: LocationSource) => void;
  setGeoStatus: (status: GeoPermissionState) => void;
  applyRealLocation: (coords: LngLat, accuracyM: number, autoFocus?: boolean, forceActivate?: boolean) => void;
  setPickup: (place: Place) => void;
  setPickupFromCoords: (coords: LngLat) => void;
  setDestination: (place: Place | null) => void;
  setDestinationFromCoords: (coords: LngLat) => void;
  swapPickupAndDestination: () => void;
  rebookRecentTrip: (summary: CompletedTripSummary) => void;
  setPickingTarget: (target: "pickup" | "destination") => void;
  setLandmarkChip: (chip: LandmarkChip) => void;
  setCustomLandmarkNote: (note: string) => void;
  setSelectedTier: (tier: Tier) => void;
  setPaymentMethod: (payment: PaymentMethod) => void;
  proceedToTierStep: () => void;
  backToLocationStep: () => void;
  confirmRiderBooking: () => void;
  cancelActiveRiderTrip: () => void;
  completeAndResetRiderTrip: (rating?: number) => void;
  sendRiderQuickNote: (note: string) => void;
  triggerRiderSos: () => void;

  // Driver actions
  setDriverOnline: (online: boolean) => void;
  acceptDriverJob: () => void;
  declineDriverJob: () => void;
  advanceDriverJob: () => void;
  cancelActiveDriverTrip: () => void;

  // Ops Command Center actions
  setTrafficEnabled: (enabled: boolean) => void;
  selectVehicle: (vehicleId: string | null) => void;
  setTierFilter: (filter: "all" | Tier) => void;
  setStatusFilter: (filter: VehicleStatusFilter) => void;
  setSearchQuery: (query: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  opsReassignDriver: (tripId: string) => void;
  opsSendLandmarkNote: (tripId: string, note: string) => void;
  opsToggleFlagVehicle: (vehicleId: string) => void;

  // Transport plumbing
  applyServerMessage: (message: ServerMessage) => void;
  setConnStatus: (status: ConnStatus) => void;
  bindTransportSend: (sendFn: ((message: ClientMessage) => void) | null) => void;
}

export const useFleetStore = create<FleetStoreState>()(
  persist(
    (set, get) => ({
      cityId: DEFAULT_CITY_ID,
      locale: "en",
      mode: "rider",
      map3dEnabled: true,
      mapStyleMode: "satellite",
      locationSource: "simulated",
      geoStatus: "idle",
      userGeo: null,
      connStatus: "connected",
      trafficEnabled: true,
      selectedVehicleId: null,
      tierFilter: "all",
      statusFilter: "all",
      searchQuery: "",
      sidebarCollapsed: false,

      vehicles: [],
      trips: [],
      kpis: INITIAL_KPIS,

      riderStep: "location",
      pickup: defaultPickupForCity(DEFAULT_CITY_ID),
      destination: defaultDestinationForCity(DEFAULT_CITY_ID),
      pickingTarget: "destination",
      landmarkChip: "Main Gate",
      customLandmarkNote: "",
      selectedTier: "bajaj",
      paymentMethod: "telebirr",
      activeRiderTripId: null,
      persistedRiderTrip: null,
      recentRiderTrips: [],

      driverOnline: false,
      driverEarningsEtb: 640,
      driverTripsCompleted: 6,
      driverOffer: null,
      activeDriverTripId: null,

      setCity: (cityId) => {
        if (cityId === get().cityId) return;
        const destination = defaultDestinationForCity(cityId);
        const userGeo = get().userGeo;
        const nextSource: LocationSource =
          get().locationSource === "real" &&
          userGeo?.isWithinCity &&
          userGeo.nearestCityId === cityId
            ? "real"
            : "simulated";
        const pickup =
          nextSource === "real" && userGeo
            ? buildGpsPickupPlace(cityId, userGeo)
            : defaultPickupForCity(cityId);
        set({
          cityId,
          locationSource: nextSource,
          pickup,
          destination,
          pickingTarget: "pickup",
          riderStep: "location",
          activeRiderTripId: null,
          persistedRiderTrip: null,
          activeDriverTripId: null,
          driverOffer: null,
          selectedVehicleId: null,
        });
        transportSendRef?.({ type: "city.switch", cityId });
        toast(`Switched to ${CITIES[cityId].name}`, {
          description: `${CITIES[cityId].region} regional dispatch`,
          tone: "neutral",
        });
      },

      setLocale: (locale) => {
        set({ locale });
      },

      setMode: (mode) => {
        set({ mode });
      },

      setMap3dEnabled: (enabled) => {
        set({ map3dEnabled: enabled });
      },

      setMapStyleMode: (styleMode) => {
        set({ mapStyleMode: styleMode });
      },

      setGeoStatus: (geoStatus) => {
        set({ geoStatus });
      },

      setLocationSource: (source) => {
        const { cityId, locationSource: prevSource, userGeo } = get();
        if (source === "simulated") {
          if (prevSource === "simulated") return;
          if (userGeo?.isWithinCity && userGeo.nearestCityId === cityId) {
            const nearest = findNearestPlace(cityId, userGeo.coords);
            const label =
              nearest.distanceMeters <= 120
                ? nearest.place.name
                : `Near ${nearest.place.name} (${nearest.distanceMeters}m)`;
            set({
              locationSource: "simulated",
              pickup: {
                id: `sim-pickup-${Date.now()}`,
                name: label,
                neighborhood: nearest.place.neighborhood,
                tag: nearest.place.tag,
                coords: userGeo.coords,
                kind: "custom",
              },
              pickingTarget: "pickup",
            });
            return;
          }
          set({
            locationSource: "simulated",
            pickup: defaultPickupForCity(cityId),
            pickingTarget: "pickup",
          });
          return;
        }
        if (!userGeo) {
          set({ locationSource: "real" });
          return;
        }
        if (userGeo.isWithinCity && userGeo.nearestCityId !== cityId) {
          const targetCity = userGeo.nearestCityId;
          transportSendRef?.({ type: "city.switch", cityId: targetCity });
          set({
            cityId: targetCity,
            destination: defaultDestinationForCity(targetCity),
          });
        }
        const activeCity = userGeo.isWithinCity ? userGeo.nearestCityId : cityId;

        set({
          locationSource: "real",
          pickup: buildGpsPickupPlace(activeCity, userGeo),
          pickingTarget: "pickup",
        });
      },

      applyRealLocation: (coords, accuracyM, autoFocus = false, forceActivate = false) => {
        const detected = detectNearestSupportedCity(coords);
        const userGeo: UserGeoPosition = {
          coords,
          accuracyM: Math.round(accuracyM),
          updatedAt: Date.now(),
          nearestCityId: detected.cityId,
          isWithinCity: detected.isWithinCity,
        };

        const prevSource = get().locationSource;
        const shouldActivateReal =
          Boolean(forceActivate) || (autoFocus && (detected.isWithinCity || prevSource === "real"));

        set({ userGeo, geoStatus: "granted" });

        if (!shouldActivateReal && prevSource !== "real") {
          return;
        }

        const targetCity = detected.isWithinCity ? detected.cityId : get().cityId;
        if (detected.isWithinCity && targetCity !== get().cityId) {
          transportSendRef?.({ type: "city.switch", cityId: targetCity });
          set({
            cityId: targetCity,
            destination: defaultDestinationForCity(targetCity),
            activeRiderTripId: null,
            persistedRiderTrip: null,
          });
        }

        // Only overwrite pickup if still choosing location
        if (get().riderStep === "location") {
          set({
            locationSource: "real",
            pickup: buildGpsPickupPlace(targetCity, userGeo),
          });
        } else {
          set({ locationSource: "real" });
        }
      },

      setPickup: (place) => {
        set((state) => ({
          locationSource: "simulated",
          pickup: place,
          pickingTarget: state.riderStep === "location" ? "destination" : state.pickingTarget,
          landmarkChip: (place.tag as LandmarkChip) ?? state.landmarkChip,
        }));
      },

      setPickupFromCoords: (coords) => {
        const { cityId, locationSource, userGeo, riderStep, pickingTarget } = get();
        if (
          locationSource === "real" &&
          userGeo &&
          haversineMeters(coords, userGeo.coords) <= 45
        ) {
          return;
        }
        const nearest = findNearestPlace(cityId, coords);
        const label =
          nearest.distanceMeters <= 120
            ? nearest.place.name
            : `Near ${nearest.place.name} (${nearest.distanceMeters}m)`;
        set({
          locationSource: "simulated",
          pickup: {
            id: `custom-pickup-${Date.now()}`,
            name: label,
            neighborhood: nearest.place.neighborhood,
            tag: nearest.place.tag,
            coords,
            kind: "custom",
          },
          pickingTarget: riderStep === "location" ? "destination" : pickingTarget,
        });
      },

      setDestination: (place) => {
        set({ destination: place });
      },

      setDestinationFromCoords: (coords) => {
        const { cityId } = get();
        const nearest = findNearestPlace(cityId, coords);
        const label =
          nearest.distanceMeters <= 150
            ? nearest.place.name
            : `Near ${nearest.place.name} (${nearest.distanceMeters}m)`;
        set({
          destination: {
            id: `custom-dest-${Date.now()}`,
            name: label,
            neighborhood: nearest.place.neighborhood,
            tag: nearest.place.tag,
            coords,
            kind: "custom",
          },
          pickingTarget: "destination",
        });
      },

      swapPickupAndDestination: () => {
        const { pickup, destination } = get();
        if (!destination) return;
        set({
          locationSource: "simulated",
          pickup: destination,
          destination: pickup,
          pickingTarget: "destination",
        });
      },

      rebookRecentTrip: (summary) => {
        if (summary.cityId !== get().cityId) {
          transportSendRef?.({ type: "city.switch", cityId: summary.cityId });
        }
        set({
          cityId: summary.cityId,
          locationSource: "simulated",
          pickup: summary.pickup,
          destination: summary.dropoff,
          selectedTier: summary.tier,
          paymentMethod: summary.payment,
          riderStep: "tier",
        });
      },

      setPickingTarget: (target) => {
        set({ pickingTarget: target });
      },

      setLandmarkChip: (chip) => {
        set({ landmarkChip: chip });
      },

      setCustomLandmarkNote: (note) => {
        set({ customLandmarkNote: note.slice(0, 60) });
      },

      setSelectedTier: (tier) => {
        set({ selectedTier: tier });
      },

      setPaymentMethod: (payment) => {
        set({ paymentMethod: payment });
      },

      proceedToTierStep: () => {
        const { destination, cityId, pickup } = get();
        if (!destination) {
          const fallback =
            CITIES[cityId].landmarks.find((l) => l.id !== pickup.id) ??
            defaultDestinationForCity(cityId);
          set({ destination: fallback, riderStep: "tier" });
          return;
        }
        set({ riderStep: "tier" });
      },

      backToLocationStep: () => {
        set({ riderStep: "location" });
      },

      confirmRiderBooking: () => {
        const { pickup, destination, selectedTier, paymentMethod, landmarkChip, customLandmarkNote, cityId } =
          get();
        const resolvedDest =
          destination ??
          CITIES[cityId].landmarks.find((l) => l.id !== pickup.id) ??
          defaultDestinationForCity(cityId);

        set({ riderStep: "trip", destination: resolvedDest });
        transportSendRef?.({
          type: "trip.request",
          pickup,
          dropoff: resolvedDest,
          tier: selectedTier,
          payment: paymentMethod,
          landmarkChip,
          landmarkNote: customLandmarkNote,
        });
      },

      cancelActiveRiderTrip: () => {
        const { activeRiderTripId } = get();
        if (activeRiderTripId) {
          transportSendRef?.({
            type: "trip.cancel",
            tripId: activeRiderTripId,
            reason: "Cancelled by rider",
          });
        }
        set({
          activeRiderTripId: null,
          persistedRiderTrip: null,
          riderStep: "location",
        });
        toast("Ride request cancelled", { tone: "warn" });
      },

      completeAndResetRiderTrip: (rating) => {
        const { activeRiderTripId, trips, recentRiderTrips } = get();
        const completed = activeRiderTripId
          ? trips.find((t) => t.id === activeRiderTripId)
          : undefined;

        let nextRecent = recentRiderTrips;
        if (completed) {
          const entry: CompletedTripSummary = {
            id: completed.id,
            cityId: completed.cityId,
            tier: completed.tier,
            pickup: completed.pickup,
            dropoff: completed.dropoff,
            fareEtb: completed.fareEtb,
            distanceKm: completed.distanceKm,
            payment: completed.payment,
            completedAt: Date.now(),
          };
          const deduped = recentRiderTrips.filter(
            (r) => !(r.pickup.id === entry.pickup.id && r.dropoff.id === entry.dropoff.id),
          );
          nextRecent = [entry, ...deduped].slice(0, 6);
        }

        set({
          activeRiderTripId: null,
          persistedRiderTrip: null,
          recentRiderTrips: nextRecent,
          riderStep: "location",
          customLandmarkNote: "",
          pickingTarget: "destination",
        });
        if (activeRiderTripId && rating) {
          transportSendRef?.({
            type: "trip.rate",
            tripId: activeRiderTripId,
            rating,
          });
          toast("Thanks for riding with CarGo", {
            description: `Rated ${rating}★`,
            tone: "live",
          });
        }
      },

      sendRiderQuickNote: (note) => {
        const trimmed = note.trim();
        const { activeRiderTripId } = get();
        if (!trimmed || !activeRiderTripId) return;
        set({ customLandmarkNote: trimmed.slice(0, 60) });
        transportSendRef?.({ type: "ops.note", tripId: activeRiderTripId, note: trimmed });
        toast("Pickup note sent to driver", {
          description: trimmed,
          tone: "live",
        });
      },

      triggerRiderSos: () => {
        const { activeRiderTripId, trips } = get();
        const activeTrip = trips.find((t) => t.id === activeRiderTripId);
        if (activeTrip?.vehicleId) {
          transportSendRef?.({
            type: "ops.flag",
            vehicleId: activeTrip.vehicleId,
            flagged: true,
          });
        }
        toast("SOS dispatched to CarGo Safety Desk", {
          description: activeTrip
            ? `Unit ${activeTrip.plate ?? activeTrip.vehicleId} flagged for immediate priority intervention`
            : "Live GPS coordinates shared with emergency dispatch",
          tone: "danger",
          durationMs: 5000,
        });
      },

      setDriverOnline: (online) => {
        set({ driverOnline: online });
        transportSendRef?.({ type: "driver.online", online });
        toast(online ? "You are now Online" : "You are now Offline", {
          description: online
            ? "Scanning for nearby landmark dispatch requests…"
            : "Ride requests paused",
          tone: online ? "live" : "neutral",
        });
      },

      acceptDriverJob: () => {
        const { driverOffer } = get();
        if (!driverOffer) return;
        set({
          activeDriverTripId: driverOffer.tripId,
          driverOffer: null,
        });
        transportSendRef?.({ type: "job.accept", offerId: driverOffer.id });
        toast("Ride accepted", {
          description: `Navigate to ${driverOffer.pickup.name}`,
          tone: "live",
        });
      },

      declineDriverJob: () => {
        const { driverOffer } = get();
        if (!driverOffer) return;
        set({ driverOffer: null });
        transportSendRef?.({ type: "job.decline", offerId: driverOffer.id });
      },

      advanceDriverJob: () => {
        const { activeDriverTripId, trips, driverEarningsEtb, driverTripsCompleted } = get();
        if (!activeDriverTripId) return;
        const currentTrip = trips.find((t) => t.id === activeDriverTripId);
        if (!currentTrip) return;

        // If advancing from IN_PROGRESS, credit earnings upon completion
        if (currentTrip.phase === "IN_PROGRESS") {
          const nextEarnings = driverEarningsEtb + currentTrip.fareEtb;
          const nextCount = driverTripsCompleted + 1;
          set({
            driverEarningsEtb: nextEarnings,
            driverTripsCompleted: nextCount,
            activeDriverTripId: null,
          });
          toast(`+${currentTrip.fareEtb} ETB earned`, {
            description: `Trip completed at ${currentTrip.dropoff.name}`,
            tone: "live",
          });
        }

        transportSendRef?.({ type: "job.advance", tripId: activeDriverTripId });
      },

      cancelActiveDriverTrip: () => {
        const { activeDriverTripId } = get();
        if (activeDriverTripId) {
          transportSendRef?.({
            type: "trip.cancel",
            tripId: activeDriverTripId,
            reason: "Cancelled by driver",
          });
        }
        set({ activeDriverTripId: null });
        toast("Trip cancelled", { tone: "warn" });
      },

      setTrafficEnabled: (enabled) => {
        set({ trafficEnabled: enabled });
        transportSendRef?.({ type: "sim.traffic", enabled });
        toast(enabled ? "Traffic simulation resumed" : "Traffic simulation paused", {
          tone: enabled ? "live" : "warn",
        });
      },

      selectVehicle: (vehicleId) => {
        set({ selectedVehicleId: vehicleId });
      },

      setTierFilter: (filter) => {
        set({ tierFilter: filter });
      },

      setStatusFilter: (filter) => {
        set({ statusFilter: filter });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      opsReassignDriver: (tripId) => {
        const previousVehicleId = get().trips.find((t) => t.id === tripId)?.vehicleId;
        transportSendRef?.({ type: "ops.reassign", tripId });
        const nextVehicleId = get().trips.find((t) => t.id === tripId)?.vehicleId;
        if (nextVehicleId && nextVehicleId !== previousVehicleId && get().selectedVehicleId !== null) {
          set({ selectedVehicleId: nextVehicleId });
        }
        toast("Driver reassigned", {
          description: `Nearest available unit dispatched to ${tripId}`,
          tone: "live",
        });
      },

      opsSendLandmarkNote: (tripId, note) => {
        const trimmed = note.trim();
        if (!trimmed) return;
        transportSendRef?.({ type: "ops.note", tripId, note: trimmed });
        toast("Landmark note sent to driver", {
          description: trimmed,
          tone: "live",
        });
      },

      opsToggleFlagVehicle: (vehicleId) => {
        const vehicle = get().vehicles.find((v) => v.id === vehicleId);
        const willFlag = !vehicle?.flagged;
        transportSendRef?.({ type: "ops.flag", vehicleId, flagged: willFlag });
        toast(willFlag ? `Flagged alert on ${vehicleId}` : `Cleared alert on ${vehicleId}`, {
          tone: willFlag ? "danger" : "neutral",
        });
      },

      applyServerMessage: (message) => {
        switch (message.type) {
          case "fleet.snapshot": {
            telemetryFrameBuffer.clear();
            for (const frame of message.frames) {
              telemetryFrameBuffer.set(frame.id, frame);
            }
            const prevRiderId = get().activeRiderTripId;
            const riderTrip =
              (prevRiderId ? message.trips.find((t) => t.id === prevRiderId) : undefined) ??
              message.trips.find((t) => t.source === "rider" && isActiveTripPhase(t.phase)) ??
              get().persistedRiderTrip;
            const driverTrip = message.trips.find(
              (t) => t.source === "driver" && isActiveTripPhase(t.phase),
            );
            set({
              cityId: message.cityId,
              vehicles: message.vehicles,
              trips: message.trips,
              kpis: message.kpis,
              trafficEnabled: message.trafficEnabled,
              driverOffer: message.driverOffer,
              activeRiderTripId: riderTrip ? riderTrip.id : prevRiderId,
              persistedRiderTrip:
                riderTrip && isActiveTripPhase(riderTrip.phase) ? riderTrip : null,
              riderStep:
                riderTrip && (isActiveTripPhase(riderTrip.phase) || riderTrip.phase === "COMPLETED")
                  ? "trip"
                  : get().riderStep,
              activeDriverTripId: driverTrip ? driverTrip.id : get().activeDriverTripId,
            });
            break;
          }

          case "fleet.tick": {
            if (message.cityId !== get().cityId) return;
            for (const frame of message.frames) {
              telemetryFrameBuffer.set(frame.id, frame);
            }
            const prevRiderId = get().activeRiderTripId;
            const latestRiderTrip = prevRiderId
              ? message.trips.find((t) => t.id === prevRiderId)
              : message.trips.find((t) => t.source === "rider" && isActiveTripPhase(t.phase));

            const latestDriverTrip = message.trips.find(
              (t) => t.source === "driver" && isActiveTripPhase(t.phase),
            );

            set({
              vehicles: message.vehicles,
              trips: message.trips,
              kpis: message.kpis,
              driverOffer: message.driverOffer,
              activeRiderTripId: latestRiderTrip ? latestRiderTrip.id : prevRiderId,
              persistedRiderTrip:
                latestRiderTrip && isActiveTripPhase(latestRiderTrip.phase)
                  ? latestRiderTrip
                  : null,
              riderStep:
                latestRiderTrip &&
                (isActiveTripPhase(latestRiderTrip.phase) || latestRiderTrip.phase === "COMPLETED")
                  ? "trip"
                  : get().riderStep,
              activeDriverTripId: latestDriverTrip ? latestDriverTrip.id : null,
            });
            break;
          }

          case "trip.updated": {
            const updated = message.trip;
            const existingTrips = get().trips;
            const hasExisting = existingTrips.some((t) => t.id === updated.id);
            const nextTrips = hasExisting
              ? existingTrips.map((t) => (t.id === updated.id ? updated : t))
              : [updated, ...existingTrips];

            if (updated.source === "rider") {
              const currentActiveId = get().activeRiderTripId;
              const isRatedCompletion =
                updated.phase === "COMPLETED" &&
                (typeof updated.rating === "number" || currentActiveId !== updated.id);

              if (updated.phase === "CANCELLED") {
                set({
                  trips: nextTrips,
                  activeRiderTripId: currentActiveId === updated.id ? null : currentActiveId,
                  persistedRiderTrip: null,
                  riderStep: currentActiveId === updated.id ? "location" : get().riderStep,
                });
              } else if (isRatedCompletion) {
                set({
                  trips: nextTrips,
                  activeRiderTripId: null,
                  persistedRiderTrip: null,
                  riderStep: "location",
                });
              } else {
                set({
                  trips: nextTrips,
                  activeRiderTripId: updated.id,
                  persistedRiderTrip: isActiveTripPhase(updated.phase) ? updated : null,
                  riderStep: "trip",
                });
              }
            } else if (updated.source === "driver") {
              set({
                trips: nextTrips,
                activeDriverTripId: isActiveTripPhase(updated.phase) ? updated.id : null,
              });
            } else {
              set({ trips: nextTrips });
            }
            break;
          }

          case "driver.offer": {
            set({ driverOffer: message.offer });
            break;
          }
        }
      },

      setConnStatus: (status) => {
        set({ connStatus: status });
      },

      bindTransportSend: (sendFn) => {
        transportSendRef = sendFn;
      },
    }),
    {
      name: "cargo-fleet-storage-v5",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        cityId: state.cityId,
        locale: state.locale,
        mode: state.mode,
        mapStyleMode: state.mapStyleMode,
        pickup: state.pickup,
        destination: state.destination,
        landmarkChip: state.landmarkChip,
        customLandmarkNote: state.customLandmarkNote,
        selectedTier: state.selectedTier,
        paymentMethod: state.paymentMethod,
        persistedRiderTrip: state.persistedRiderTrip,
        recentRiderTrips: state.recentRiderTrips,
        driverEarningsEtb: state.driverEarningsEtb,
        driverTripsCompleted: state.driverTripsCompleted,
      }),
    },
  ),
);
