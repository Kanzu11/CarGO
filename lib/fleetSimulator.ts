import { CITIES, DEFAULT_CITY_ID, findNearestPlace } from "@/lib/cities";
import { estimateTravelMinutes, lockedFare } from "@/lib/fare";
import { bearingDeg, clamp, haversineKm, lerpLngLat, samplePolyline } from "@/lib/geo";
import { createSeededDriverAndPlate } from "@/lib/identity";
import { createPrng, hashSeed, pickRandom, type Prng } from "@/lib/random";
import { fetchRoadRoute, getCachedRoadRoute } from "@/lib/roadRouting";
import { buildAdjacency, computeCityRoute } from "@/lib/routing";
import { TIERS, TIER_ORDER } from "@/lib/tiers";
import { isActiveTripPhase, transitionTrip } from "@/lib/tripMachine";
import type {
  CityId,
  ClientMessage,
  DriverJobOffer,
  FleetKpis,
  LandmarkChip,
  LngLat,
  PaymentMethod,
  Place,
  ServerMessage,
  Tier,
  Trip,
  Vehicle,
  VehicleStatus,
  VehicleTelemetryFrame,
} from "@/types/fleet";

export const TICK_INTERVAL_MS = 1000;

/**
 * Time compression for demo responsiveness:
 * Fares & displayed ETAs use real-world km and minutes, while map motion runs
 * faster so an approach leg completes in ~10s and a trip leg in ~18s.
 */
export const SIM_SPEED_MULTIPLIER = 7.5;

interface InternalVehicleState {
  vehicle: Vehicle;
  currentNodeId: string;
  targetNodeId: string;
  edgeProgress: number;
  prevPosition: LngLat;
  prevBearing: number;
}

interface InternalTripState {
  trip: Trip;
  phaseTicks: number;
  /** Total ticks expected for the current movement leg. */
  legDurationTicks: number;
  legElapsedTicks: number;
  dispatchLatencySec: number;
}

const PAYMENT_METHODS: ReadonlyArray<PaymentMethod> = ["telebirr", "cash", "cbe_birr"];
const LANDMARK_NOTES: ReadonlyArray<string> = [
  "In front of the blue gate",
  "Beside Commercial Bank ATM",
  "Under the pedestrian overpass",
  "Opposite the pharmacy sign",
  "Next to the yellow Bajaj queue",
  "Wait by the main security booth",
];

export type SimulatorListener = (message: ServerMessage) => void;

export class FleetSimulator {
  private cityId: CityId = DEFAULT_CITY_ID;
  private rng: Prng = createPrng(hashSeed(DEFAULT_CITY_ID));
  private vehicles = new Map<string, InternalVehicleState>();
  private trips = new Map<string, InternalTripState>();
  private listeners = new Set<SimulatorListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private tripSeq = 100;
  private offerSeq = 1;

  private trafficEnabled = true;
  private driverOnline = false;
  private driverOnlineTicks = 0;
  private driverOffer: DriverJobOffer | null = null;
  private playerVehicleId = "";

  private completedToday = 14;
  private liveVolumeEtb = 2450;
  private dispatchSamplesSec: number[] = [2.8, 3.4, 3.1, 2.9, 3.5];

  constructor(initialCity: CityId = DEFAULT_CITY_ID) {
    this.initCity(initialCity, Date.now());
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.step(Date.now());
    }, TICK_INTERVAL_MS);
  }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  public subscribe(listener: SimulatorListener): () => void {
    this.listeners.add(listener);
    listener(this.buildSnapshot(Date.now()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCityId(): CityId {
    return this.cityId;
  }

  public getSnapshot(now = Date.now()): Extract<ServerMessage, { type: "fleet.snapshot" }> {
    return this.buildSnapshot(now);
  }

  /** Restores an active rider trip from persisted localStorage after a reload. */
  public restorePersistedTrip(persisted: Trip, now = Date.now()): void {
    if (persisted.cityId !== this.cityId || !isActiveTripPhase(persisted.phase)) {
      return;
    }
    if (this.trips.has(persisted.id)) {
      return;
    }
    const vehicleState =
      (persisted.vehicleId ? this.vehicles.get(persisted.vehicleId) : undefined) ??
      this.findNearestAvailableVehicle(persisted.tier, persisted.pickup.coords, true);

    const assignedVehicle = vehicleState?.vehicle;
    const restoredTrip: Trip = {
      ...persisted,
      vehicleId: assignedVehicle?.id,
      driver: assignedVehicle?.driver,
      plate: assignedVehicle?.plate,
      updatedAt: now,
    };

    if (vehicleState) {
      vehicleState.vehicle.tripId = restoredTrip.id;
      vehicleState.vehicle.status =
        restoredTrip.phase === "IN_PROGRESS" ? "on_trip" : "enroute_pickup";
    }

    const legDurationTicks = restoredTrip.phase === "IN_PROGRESS" ? 18 : 10;
    const legElapsedTicks = Math.round(clamp(restoredTrip.progress, 0, 0.9) * legDurationTicks);

    this.trips.set(restoredTrip.id, {
      trip: restoredTrip,
      phaseTicks: 0,
      legDurationTicks,
      legElapsedTicks,
      dispatchLatencySec: 2.6,
    });
  }

  public handleClientMessage(message: ClientMessage, now = Date.now()): void {
    switch (message.type) {
      case "city.switch": {
        if (message.cityId !== this.cityId) {
          this.initCity(message.cityId, now);
          this.emit(this.buildSnapshot(now));
        }
        break;
      }
      case "sim.traffic": {
        this.trafficEnabled = message.enabled;
        this.emit(this.buildSnapshot(now));
        break;
      }
      case "trip.request": {
        this.createRiderTrip(
          {
            pickup: message.pickup,
            dropoff: message.dropoff,
            tier: message.tier,
            payment: message.payment,
            landmarkChip: message.landmarkChip,
            landmarkNote: message.landmarkNote,
          },
          now,
        );
        this.emit(this.buildTick(now));
        break;
      }
      case "trip.cancel": {
        this.cancelTrip(message.tripId, message.reason ?? "Cancelled by user", now);
        this.emit(this.buildTick(now));
        break;
      }
      case "trip.rate": {
        const entry = this.trips.get(message.tripId);
        if (entry) {
          entry.trip = { ...entry.trip, rating: clamp(message.rating, 1, 5), updatedAt: now };
          this.emit({ type: "trip.updated", trip: entry.trip });
        }
        break;
      }
      case "driver.online": {
        this.setDriverOnline(message.online, now);
        this.emit(this.buildTick(now));
        break;
      }
      case "job.accept": {
        this.acceptDriverOffer(message.offerId, now);
        this.emit(this.buildTick(now));
        break;
      }
      case "job.decline": {
        if (this.driverOffer && this.driverOffer.id === message.offerId) {
          this.driverOffer = null;
          this.driverOnlineTicks = 0; // next offer in 3 ticks
          this.emit({ type: "driver.offer", offer: null });
          this.emit(this.buildTick(now));
        }
        break;
      }
      case "job.advance": {
        this.advanceDriverTrip(message.tripId, now);
        this.emit(this.buildTick(now));
        break;
      }
      case "ops.reassign": {
        this.reassignTripVehicle(message.tripId, now);
        this.emit(this.buildTick(now));
        break;
      }
      case "ops.note": {
        this.addOpsLandmarkNote(message.tripId, message.note, now);
        this.emit(this.buildTick(now));
        break;
      }
      case "ops.flag": {
        this.toggleVehicleFlag(message.vehicleId, message.flagged, now);
        this.emit(this.buildTick(now));
        break;
      }
    }
  }

  /** Advances the entire city simulation by 1 authoritative second. */
  public step(now = Date.now()): void {
    this.tickCount += 1;

    // 1. Advance active trips and their assigned vehicles
    for (const state of this.trips.values()) {
      this.stepTrip(state, now);
    }

    // 2. Advance idle roaming vehicles along road-graph edges
    for (const vState of this.vehicles.values()) {
      if (vState.vehicle.tripId) continue;
      this.stepIdleVehicle(vState);
    }

    // 3. Background trip demand generator for Command Center
    if (this.trafficEnabled) {
      const activeBgCount = Array.from(this.trips.values()).filter(
        (t) => t.trip.source === "background" && isActiveTripPhase(t.trip.phase),
      ).length;
      if (activeBgCount < 4 || (activeBgCount < 6 && this.tickCount % 5 === 0)) {
        this.spawnBackgroundTrip(now);
      }
    }

    // 4. Driver Mode incoming request trigger (fires after 3 seconds online)
    this.stepDriverOfferTrigger(now);

    // 5. Prune old completed/cancelled background trips so memory stays bounded
    this.pruneOldBackgroundTrips(now);

    this.emit(this.buildTick(now));
  }

  private initCity(cityId: CityId, now: number): void {
    this.cityId = cityId;
    this.rng = createPrng(hashSeed(`sim:${cityId}`));
    this.vehicles.clear();
    this.trips.clear();
    this.tickCount = 0;
    this.driverOffer = null;
    this.driverOnlineTicks = 0;
    this.completedToday = 14 + Math.floor(this.rng() * 8);
    this.liveVolumeEtb = 2200 + Math.round((this.rng() * 900) / 5) * 5;
    this.dispatchSamplesSec = [2.7, 3.2, 2.9, 3.5, 3.0];

    const city = CITIES[cityId];
    const adj = buildAdjacency(city.graph);
    const sortedNodeIds = Object.keys(city.graph.nodes).sort(
      (a, b) =>
        haversineKm(city.graph.nodes[a]!, city.center) -
        haversineKm(city.graph.nodes[b]!, city.center),
    );
    const coreNodeIds = sortedNodeIds.slice(0, Math.min(sortedNodeIds.length, 8));
    const coreSet = new Set(coreNodeIds);
    const outerNodeIds = sortedNodeIds.slice(coreNodeIds.length);

    // Interleave tiers round-robin so every tier appears both downtown and citywide
    const remaining: Record<Tier, number> = {
      bajaj: TIERS.bajaj.spawnCount,
      economy: TIERS.economy.spawnCount,
      minivan: TIERS.minivan.spawnCount,
      cargo: TIERS.cargo.spawnCount,
    };
    const tierSchedule: Tier[] = [];
    while (tierSchedule.length < 20) {
      let pushed = false;
      for (const tier of TIER_ORDER) {
        if (remaining[tier] > 0) {
          tierSchedule.push(tier);
          remaining[tier] -= 1;
          pushed = true;
        }
      }
      if (!pushed) break;
    }

    const prefix = city.id.slice(0, 2).toUpperCase();

    tierSchedule.forEach((tier, idx) => {
      const id = `CG-${prefix}-${String(idx + 1).padStart(2, "0")}`;
      const isCoreVehicle = idx < 13;
      const startNode = isCoreVehicle
        ? coreNodeIds[idx % coreNodeIds.length]!
        : (outerNodeIds[(idx - 13) % Math.max(1, outerNodeIds.length)] ??
          sortedNodeIds[idx % sortedNodeIds.length]!);
      const neighbors = adj[startNode] ?? [];
      const coreNeighbors = neighbors.filter((n) => coreSet.has(n));
      const candidateNeighbors =
        isCoreVehicle && coreNeighbors.length > 0 ? coreNeighbors : neighbors;
      const targetNode =
        candidateNeighbors[idx % Math.max(1, candidateNeighbors.length)] ?? startNode;
      const startCoords = city.graph.nodes[startNode]!;
      const targetCoords = city.graph.nodes[targetNode]!;
      const edgeProgress = Number(((idx * 0.23) % 0.85).toFixed(2));
      const position = lerpLngLat(startCoords, targetCoords, edgeProgress);
      const bearing = bearingDeg(startCoords, targetCoords);
      const { driver, plate } = createSeededDriverAndPlate(cityId, idx);
      const nearest = findNearestPlace(cityId, position);
      const isPlayerDriver = idx === 0;
      if (isPlayerDriver) {
        this.playerVehicleId = id;
      }

      const vehicle: Vehicle = {
        id,
        cityId,
        tier,
        status: "idle",
        position,
        bearing,
        speedKmh: Math.round(TIERS[tier].avgSpeedKmh * (0.72 + this.rng() * 0.3)),
        signal: idx % 7 === 0 ? 3 : 4,
        driver,
        plate,
        landmark: nearest.place.name,
        isPlayerDriver,
      };

      this.vehicles.set(id, {
        vehicle,
        currentNodeId: startNode,
        targetNodeId: targetNode,
        edgeProgress,
        prevPosition: position,
        prevBearing: bearing,
      });
    });

    // Seed 4 live background trips immediately so /dispatch opens with active traffic
    for (let i = 0; i < 4; i++) {
      this.spawnBackgroundTrip(now - (4 - i) * 12000, i < 2 ? "IN_PROGRESS" : "ARRIVING");
    }
  }

  private stepIdleVehicle(vState: InternalVehicleState): void {
    const { vehicle } = vState;
    vState.prevPosition = vehicle.position;
    vState.prevBearing = vehicle.bearing;

    if (vehicle.status === "offline" || !this.trafficEnabled) {
      vehicle.speedKmh = 0;
      return;
    }

    const city = CITIES[this.cityId];
    const fromCoord = city.graph.nodes[vState.currentNodeId];
    const toCoord = city.graph.nodes[vState.targetNodeId];
    if (!fromCoord || !toCoord) return;

    const edgeKm = Math.max(0.15, haversineKm(fromCoord, toCoord));
    const tierMeta = TIERS[vehicle.tier];
    const speedVariation = 0.82 + this.rng() * 0.32;
    const speedKmh = Math.round(tierMeta.avgSpeedKmh * speedVariation);
    vehicle.speedKmh = speedKmh;

    const stepKm = (speedKmh / 3600) * SIM_SPEED_MULTIPLIER;
    const deltaProgress = clamp(stepKm / edgeKm, 0.08, 0.42);
    let nextProgress = vState.edgeProgress + deltaProgress;

    if (nextProgress >= 1) {
      const adj = buildAdjacency(city.graph);
      const arrivedNode = vState.targetNodeId;
      const neighbors = adj[arrivedNode] ?? [];
      const forwardChoices = neighbors.filter((n) => n !== vState.currentNodeId);
      const distFromCenter = haversineKm(city.graph.nodes[arrivedNode]!, city.center);
      let nextTarget: string;
      if (distFromCenter > 1.8 && forwardChoices.length > 1 && this.rng() < 0.65) {
        nextTarget = forwardChoices.reduce((closest, candidate) =>
          haversineKm(city.graph.nodes[candidate]!, city.center) <
          haversineKm(city.graph.nodes[closest]!, city.center)
            ? candidate
            : closest,
        );
      } else {
        nextTarget =
          forwardChoices.length > 0
            ? pickRandom(forwardChoices, this.rng)
            : (neighbors[0] ?? vState.currentNodeId);
      }

      vState.currentNodeId = arrivedNode;
      vState.targetNodeId = nextTarget;
      nextProgress = nextProgress - 1;
    }

    vState.edgeProgress = clamp(nextProgress, 0, 1);
    const updatedFrom = city.graph.nodes[vState.currentNodeId]!;
    const updatedTo = city.graph.nodes[vState.targetNodeId]!;
    vehicle.position = lerpLngLat(updatedFrom, updatedTo, vState.edgeProgress);
    vehicle.bearing = bearingDeg(updatedFrom, updatedTo);
    vehicle.landmark = findNearestPlace(this.cityId, vehicle.position).place.name;
    if (!vehicle.flagged) {
      vehicle.status = "idle";
    }
  }

  private stepTrip(tState: InternalTripState, now: number): void {
    const { trip } = tState;
    if (!isActiveTripPhase(trip.phase)) return;

    // Background trips pause cleanly when Simulate Traffic is switched off
    if (trip.source === "background" && !this.trafficEnabled) {
      const pausedVehicle = trip.vehicleId ? this.vehicles.get(trip.vehicleId) : undefined;
      if (pausedVehicle) {
        pausedVehicle.prevPosition = pausedVehicle.vehicle.position;
        pausedVehicle.prevBearing = pausedVehicle.vehicle.bearing;
        pausedVehicle.vehicle.speedKmh = 0;
      }
      return;
    }

    tState.phaseTicks += 1;
    const vState = trip.vehicleId ? this.vehicles.get(trip.vehicleId) : undefined;

    if (trip.phase === "REQUESTED") {
      tState.trip = transitionTrip(trip, "SEARCHING", now, "Matching nearest fleet unit");
      tState.phaseTicks = 0;
      return;
    }

    if (trip.phase === "SEARCHING") {
      if (tState.phaseTicks >= 2) {
        const candidate = this.findNearestAvailableVehicle(
          trip.tier,
          trip.pickup.coords,
          trip.source === "rider",
        );
        if (!candidate) return;
        this.bindVehicleToTrip(tState, candidate, now);
      }
      return;
    }

    if (trip.phase === "DRIVER_ASSIGNED") {
      if (vState) {
        vState.prevPosition = vState.vehicle.position;
        vState.prevBearing = vState.vehicle.bearing;
      }
      // Driver mode jobs wait for manual button progression OR auto- transition to ARRIVING
      if (tState.phaseTicks >= 2) {
        tState.trip = transitionTrip(
          trip,
          "ARRIVING",
          now,
          `${trip.driver?.name ?? "Driver"} en route to ${trip.pickup.name}`,
        );
        tState.phaseTicks = 0;
        tState.legElapsedTicks = 0;
        if (trip.source === "rider") {
          this.emit({ type: "trip.updated", trip: tState.trip });
        }
      }
      return;
    }

    if (trip.phase === "ARRIVING") {
      const approach = trip.approachRoute ?? [trip.pickup.coords, trip.pickup.coords];
      tState.legElapsedTicks = Math.min(tState.legDurationTicks, tState.legElapsedTicks + 1);
      const progress = clamp(tState.legElapsedTicks / Math.max(1, tState.legDurationTicks), 0, 1);
      const sampled = samplePolyline(approach, progress);

      if (vState) {
        vState.prevPosition = vState.vehicle.position;
        vState.prevBearing = vState.vehicle.bearing;
        vState.vehicle.position = sampled.position;
        vState.vehicle.bearing = sampled.bearing;
        vState.vehicle.speedKmh = progress >= 1 ? 0 : TIERS[trip.tier].avgSpeedKmh;
        vState.vehicle.status = vState.vehicle.flagged ? "alert" : "enroute_pickup";
        vState.vehicle.landmark = findNearestPlace(this.cityId, sampled.position).place.name;
      }

      const approachKm = Math.max(0.2, haversineKm(sampled.position, trip.pickup.coords));
      tState.trip = {
        ...trip,
        progress,
        remainingKm: Number(approachKm.toFixed(2)),
        remainingEtaMin: Math.max(1, Math.ceil((1 - progress) * 4)),
        updatedAt: now,
      };

      // Driver-mode jobs wait for the driver to click "Arrived at Pickup" / "Start Trip"
      if (trip.source === "driver") {
        return;
      }

      if (tState.legElapsedTicks >= tState.legDurationTicks) {
        const tripDurationTicks = clamp(Math.round(trip.distanceKm * 4.5), 12, 24);
        tState.legDurationTicks = tripDurationTicks;
        tState.legElapsedTicks = 0;
        tState.phaseTicks = 0;
        const transitioned = transitionTrip(
          tState.trip,
          "IN_PROGRESS",
          now,
          `Picked up at ${trip.pickup.name}`,
        );
        tState.trip = {
          ...transitioned,
          progress: 0,
          remainingKm: trip.distanceKm,
          remainingEtaMin: trip.etaMinutes,
        };
        if (vState) {
          vState.vehicle.status = vState.vehicle.flagged ? "alert" : "on_trip";
        }
        if (trip.source === "rider") {
          this.emit({ type: "trip.updated", trip: tState.trip });
        }
      }
      return;
    }

    if (trip.phase === "IN_PROGRESS") {
      tState.legElapsedTicks = Math.min(tState.legDurationTicks, tState.legElapsedTicks + 1);
      const progress = clamp(tState.legElapsedTicks / Math.max(1, tState.legDurationTicks), 0, 1);
      const sampled = samplePolyline(trip.route, progress);

      if (vState) {
        vState.prevPosition = vState.vehicle.position;
        vState.prevBearing = vState.vehicle.bearing;
        vState.vehicle.position = sampled.position;
        vState.vehicle.bearing = sampled.bearing;
        vState.vehicle.speedKmh =
          progress >= 1 ? 0 : Math.round(TIERS[trip.tier].avgSpeedKmh * (0.9 + this.rng() * 0.2));
        vState.vehicle.status = vState.vehicle.flagged ? "alert" : "on_trip";
        vState.vehicle.landmark = findNearestPlace(this.cityId, sampled.position).place.name;
      }

      const remainingKm = Number(Math.max(0, trip.distanceKm * (1 - progress)).toFixed(2));
      const remainingEtaMin = Math.max(1, Math.ceil(trip.etaMinutes * (1 - progress)));

      tState.trip = {
        ...trip,
        progress,
        remainingKm,
        remainingEtaMin,
        updatedAt: now,
      };

      // Driver-mode jobs allow the driver to click "Complete Trip" manually
      if (trip.source === "driver") {
        return;
      }

      if (tState.legElapsedTicks >= tState.legDurationTicks) {
        this.completeTripInternal(tState, now);
      }
    }
  }

  private completeTripInternal(tState: InternalTripState, now: number): void {
    const completed = transitionTrip(
      tState.trip,
      "COMPLETED",
      now,
      `Arrived at ${tState.trip.dropoff.name} • ${tState.trip.fareEtb} ETB`,
    );
    tState.trip = {
      ...completed,
      progress: 1,
      remainingKm: 0,
      remainingEtaMin: 0,
    };

    this.completedToday += 1;
    this.liveVolumeEtb += completed.fareEtb;

    if (completed.vehicleId) {
      const vState = this.vehicles.get(completed.vehicleId);
      if (vState) {
        this.releaseVehicleToGraph(vState, completed.dropoff.coords);
      }
    }

    if (completed.source === "rider" || completed.source === "driver") {
      this.emit({ type: "trip.updated", trip: tState.trip });
    }
  }

  private releaseVehicleToGraph(vState: InternalVehicleState, atCoords: LngLat): void {
    const city = CITIES[this.cityId];
    const adj = buildAdjacency(city.graph);
    const nearestRoute = computeCityRoute(this.cityId, atCoords, city.center);
    const snapNode = nearestRoute.nodeIds[0] ?? Object.keys(city.graph.nodes)[0]!;
    const neighbors = adj[snapNode] ?? [];
    const nextNode = neighbors[0] ?? snapNode;

    vState.vehicle.tripId = undefined;
    vState.vehicle.status = vState.vehicle.flagged ? "alert" : "idle";
    vState.currentNodeId = snapNode;
    vState.targetNodeId = nextNode;
    vState.edgeProgress = 0;
  }

  private findNearestAvailableVehicle(
    tier: Tier,
    target: LngLat,
    allowPreemptBackground: boolean,
    excludeVehicleId?: string,
  ): InternalVehicleState | undefined {
    const candidates = Array.from(this.vehicles.values()).filter((v) => {
      if (v.vehicle.id === excludeVehicleId) return false;
      if (v.vehicle.status === "offline") return false;
      if (v.vehicle.isPlayerDriver && this.driverOnline) return false;
      return !v.vehicle.tripId && v.vehicle.tier === tier;
    });

    const pickClosest = (list: InternalVehicleState[]): InternalVehicleState | undefined => {
      let best: InternalVehicleState | undefined;
      let bestDist = Infinity;
      for (const item of list) {
        const d = haversineKm(item.vehicle.position, target);
        if (d < bestDist) {
          bestDist = d;
          best = item;
        }
      }
      return best;
    };

    const direct = pickClosest(candidates);
    if (direct) return direct;

    if (!allowPreemptBackground) return undefined;

    // Fallback 1: any idle vehicle regardless of tier
    const anyIdle = Array.from(this.vehicles.values()).filter(
      (v) =>
        v.vehicle.id !== excludeVehicleId &&
        v.vehicle.status !== "offline" &&
        !v.vehicle.tripId &&
        !(v.vehicle.isPlayerDriver && this.driverOnline),
    );
    const fallbackIdle = pickClosest(anyIdle);
    if (fallbackIdle) return fallbackIdle;

    // Fallback 2: preempt a background trip vehicle so a rider request never stalls
    const bgVehicles = Array.from(this.vehicles.values()).filter((v) => {
      if (v.vehicle.id === excludeVehicleId || !v.vehicle.tripId) return false;
      const t = this.trips.get(v.vehicle.tripId);
      return t?.trip.source === "background";
    });
    const preempted = pickClosest(bgVehicles);
    if (preempted && preempted.vehicle.tripId) {
      this.trips.delete(preempted.vehicle.tripId);
      preempted.vehicle.tripId = undefined;
    }
    return preempted;
  }

  /** Resolves real OSRM street geometry asynchronously in the browser and updates active trips in-place. */
  private hydrateTripRoute(
    tripId: string,
    kind: "route" | "approachRoute",
    from: LngLat,
    to: LngLat,
  ): void {
    if (typeof window === "undefined") return;
    const expectedCity = this.cityId;
    void fetchRoadRoute(expectedCity, from, to).then((road) => {
      if (!road.isRealRoad || this.cityId !== expectedCity) return;
      const entry = this.trips.get(tripId);
      if (!entry || !isActiveTripPhase(entry.trip.phase)) return;

      if (kind === "route") {
        const fareEtb = lockedFare(entry.trip.tier, road.distanceKm);
        const etaMinutes = estimateTravelMinutes(entry.trip.tier, road.distanceKm);
        entry.trip = {
          ...entry.trip,
          route: road.coords,
          distanceKm: road.distanceKm,
          etaMinutes,
          fareEtb: entry.trip.source === "rider" ? entry.trip.fareEtb : fareEtb,
          remainingKm:
            entry.trip.phase === "IN_PROGRESS"
              ? Number((road.distanceKm * (1 - entry.trip.progress)).toFixed(2))
              : entry.trip.remainingKm,
          updatedAt: Date.now(),
        };
      } else {
        entry.trip = {
          ...entry.trip,
          approachRoute: road.coords,
          updatedAt: Date.now(),
        };
      }

      if (entry.trip.source === "rider" || entry.trip.source === "driver") {
        this.emit({ type: "trip.updated", trip: entry.trip });
      }
    });
  }

  private bindVehicleToTrip(
    tState: InternalTripState,
    vState: InternalVehicleState,
    now: number,
    customNote?: string,
  ): void {
    const { trip } = tState;
    const approach =
      getCachedRoadRoute(vState.vehicle.position, trip.pickup.coords) ??
      computeCityRoute(this.cityId, vState.vehicle.position, trip.pickup.coords);
    const approachTicks = clamp(Math.round(approach.distanceKm * 4), 6, 12);

    vState.vehicle.tripId = trip.id;
    vState.vehicle.status = vState.vehicle.flagged ? "alert" : "enroute_pickup";

    const nextPhase = trip.phase === "DRIVER_ASSIGNED" ? "ARRIVING" : "DRIVER_ASSIGNED";
    const note =
      customNote ??
      `Assigned ${vState.vehicle.driver.name} (${vState.vehicle.plate})`;

    const transitioned =
      trip.phase === nextPhase ? trip : transitionTrip(trip, nextPhase, now, note);

    tState.trip = {
      ...transitioned,
      vehicleId: vState.vehicle.id,
      driver: vState.vehicle.driver,
      plate: vState.vehicle.plate,
      approachRoute: approach.coords,
      progress: 0,
      remainingKm: approach.distanceKm,
      remainingEtaMin: Math.max(1, Math.round((approach.distanceKm / TIERS[trip.tier].avgSpeedKmh) * 60)),
      updatedAt: now,
    };
    tState.phaseTicks = 0;
    tState.legDurationTicks = approachTicks;
    tState.legElapsedTicks = 0;

    this.dispatchSamplesSec = [...this.dispatchSamplesSec.slice(-11), tState.dispatchLatencySec];
    if (tState.trip.source === "rider") {
      this.emit({ type: "trip.updated", trip: tState.trip });
    }
    this.hydrateTripRoute(trip.id, "approachRoute", vState.vehicle.position, trip.pickup.coords);
  }

  private createRiderTrip(
    params: {
      pickup: Place;
      dropoff: Place;
      tier: Tier;
      payment: PaymentMethod;
      landmarkChip?: LandmarkChip;
      landmarkNote?: string;
    },
    now: number,
  ): Trip {
    // Cancel any previous active rider trip first
    for (const existing of this.trips.values()) {
      if (existing.trip.source === "rider" && isActiveTripPhase(existing.trip.phase)) {
        this.cancelTrip(existing.trip.id, "Replaced by new ride request", now);
      }
    }

    const id = `TRP-${++this.tripSeq}`;
    const routeResult =
      getCachedRoadRoute(params.pickup.coords, params.dropoff.coords) ??
      computeCityRoute(this.cityId, params.pickup.coords, params.dropoff.coords);
    const fareEtb = lockedFare(params.tier, routeResult.distanceKm);
    const etaMinutes = estimateTravelMinutes(params.tier, routeResult.distanceKm);
    const noteParts = [params.landmarkChip, params.landmarkNote?.trim()].filter(Boolean);
    const combinedNote = noteParts.length > 0 ? noteParts.join(" · ") : params.pickup.tag;

    const trip: Trip = {
      id,
      cityId: this.cityId,
      tier: params.tier,
      phase: "SEARCHING",
      pickup: params.pickup,
      dropoff: params.dropoff,
      landmarkChip: params.landmarkChip,
      landmarkNote: combinedNote,
      route: routeResult.coords,
      distanceKm: routeResult.distanceKm,
      etaMinutes,
      fareEtb,
      payment: params.payment,
      source: "rider",
      createdAt: now,
      updatedAt: now,
      progress: 0,
      remainingKm: routeResult.distanceKm,
      remainingEtaMin: etaMinutes,
      timeline: [
        { phase: "REQUESTED", at: now, note: `Pickup at ${params.pickup.name} (${combinedNote})` },
        { phase: "SEARCHING", at: now, note: `Scanning nearby ${TIERS[params.tier].name} units` },
      ],
    };

    this.trips.set(id, {
      trip,
      phaseTicks: 0,
      legDurationTicks: 10,
      legElapsedTicks: 0,
      dispatchLatencySec: Number((1.8 + this.rng() * 1.4).toFixed(1)),
    });

    this.emit({ type: "trip.updated", trip });
    this.hydrateTripRoute(id, "route", params.pickup.coords, params.dropoff.coords);
    return trip;
  }

  private spawnBackgroundTrip(now: number, initialPhase: "REQUESTED" | "ARRIVING" | "IN_PROGRESS" = "REQUESTED"): void {
    const city = CITIES[this.cityId];
    if (city.landmarks.length < 2) return;

    const pickup = pickRandom(city.landmarks, this.rng);
    const otherLandmarks = city.landmarks.filter((l) => l.id !== pickup.id);
    const dropoff = pickRandom(otherLandmarks, this.rng);
    const tier = pickRandom(TIER_ORDER, this.rng);

    const candidate = this.findNearestAvailableVehicle(tier, pickup.coords, false);
    if (!candidate && initialPhase !== "REQUESTED") return;

    const id = `TRP-${++this.tripSeq}`;
    const routeResult =
      getCachedRoadRoute(pickup.coords, dropoff.coords) ??
      computeCityRoute(this.cityId, pickup.coords, dropoff.coords);
    const fareEtb = lockedFare(tier, routeResult.distanceKm);
    const etaMinutes = estimateTravelMinutes(tier, routeResult.distanceKm);
    const payment = pickRandom(PAYMENT_METHODS, this.rng);
    const landmarkNote = `${pickup.tag} · ${pickRandom(LANDMARK_NOTES, this.rng)}`;

    const baseTrip: Trip = {
      id,
      cityId: this.cityId,
      tier,
      phase: "REQUESTED",
      pickup,
      dropoff,
      landmarkNote,
      route: routeResult.coords,
      distanceKm: routeResult.distanceKm,
      etaMinutes,
      fareEtb,
      payment,
      source: "background",
      createdAt: now,
      updatedAt: now,
      progress: 0,
      remainingKm: routeResult.distanceKm,
      remainingEtaMin: etaMinutes,
      timeline: [{ phase: "REQUESTED", at: now, note: `${pickup.name} → ${dropoff.name}` }],
    };

    const tState: InternalTripState = {
      trip: baseTrip,
      phaseTicks: 0,
      legDurationTicks: 10,
      legElapsedTicks: 0,
      dispatchLatencySec: Number((2.1 + this.rng() * 1.8).toFixed(1)),
    };

    this.trips.set(id, tState);
    this.hydrateTripRoute(id, "route", pickup.coords, dropoff.coords);

    if (initialPhase !== "REQUESTED" && candidate) {
      tState.trip = transitionTrip(tState.trip, "SEARCHING", now);
      this.bindVehicleToTrip(tState, candidate, now);
      tState.trip = transitionTrip(tState.trip, "ARRIVING", now, "En route to pickup");
      if (initialPhase === "IN_PROGRESS") {
        const duration = clamp(Math.round(routeResult.distanceKm * 4.5), 12, 22);
        const elapsed = Math.floor(duration * (0.25 + this.rng() * 0.45));
        const progress = elapsed / duration;
        const sampled = samplePolyline(routeResult.coords, progress);
        candidate.vehicle.position = sampled.position;
        candidate.vehicle.bearing = sampled.bearing;
        candidate.vehicle.status = "on_trip";
        tState.legDurationTicks = duration;
        tState.legElapsedTicks = elapsed;
        tState.trip = {
          ...transitionTrip(tState.trip, "IN_PROGRESS", now, `Picked up at ${pickup.name}`),
          progress,
          remainingKm: Number((routeResult.distanceKm * (1 - progress)).toFixed(2)),
          remainingEtaMin: Math.max(1, Math.ceil(etaMinutes * (1 - progress))),
        };
      }
    }
  }

  private setDriverOnline(online: boolean, now: number): void {
    this.driverOnline = online;
    this.driverOnlineTicks = 0;
    const playerState = this.vehicles.get(this.playerVehicleId);

    if (!online) {
      this.driverOffer = null;
      this.emit({ type: "driver.offer", offer: null });
      if (playerState && !playerState.vehicle.tripId) {
        playerState.vehicle.status = "offline";
        playerState.vehicle.speedKmh = 0;
      }
      return;
    }

    if (playerState) {
      // Detach from any background trip so the player vehicle is ready for their incoming request
      if (playerState.vehicle.tripId) {
        const attached = this.trips.get(playerState.vehicle.tripId);
        if (attached && attached.trip.source === "background") {
          this.trips.delete(attached.trip.id);
          playerState.vehicle.tripId = undefined;
        }
      }
      if (!playerState.vehicle.tripId) {
        playerState.vehicle.status = "idle";
      }
    }
    void now;
  }

  private stepDriverOfferTrigger(now: number): void {
    if (!this.driverOnline) return;
    const playerState = this.vehicles.get(this.playerVehicleId);
    if (!playerState) return;

    // Do not send a new offer while the driver is already on an active driver job
    if (playerState.vehicle.tripId) {
      const currentTrip = this.trips.get(playerState.vehicle.tripId);
      if (currentTrip && isActiveTripPhase(currentTrip.trip.phase)) {
        return;
      }
    }

    if (this.driverOffer) {
      if (now >= this.driverOffer.expiresAt) {
        this.driverOffer = null;
        this.driverOnlineTicks = 0;
        this.emit({ type: "driver.offer", offer: null });
      }
      return;
    }

    this.driverOnlineTicks += 1;
    // Trigger incoming ride request card after 3 seconds online
    if (this.driverOnlineTicks >= 3) {
      this.driverOffer = this.createDriverOffer(playerState, now);
      this.emit({ type: "driver.offer", offer: this.driverOffer });
    }
  }

  private createDriverOffer(playerState: InternalVehicleState, now: number): DriverJobOffer {
    const city = CITIES[this.cityId];
    const pickup = pickRandom(city.landmarks, this.rng);
    const dropoffCandidates = city.landmarks.filter((l) => l.id !== pickup.id);
    const dropoff = pickRandom(dropoffCandidates, this.rng);

    const approach =
      getCachedRoadRoute(playerState.vehicle.position, pickup.coords) ??
      computeCityRoute(this.cityId, playerState.vehicle.position, pickup.coords);
    const tripRoute =
      getCachedRoadRoute(pickup.coords, dropoff.coords) ??
      computeCityRoute(this.cityId, pickup.coords, dropoff.coords);
    const tier = playerState.vehicle.tier;
    const payoutEtb = lockedFare(tier, tripRoute.distanceKm);
    const payment: PaymentMethod = this.offerSeq % 2 === 1 ? "telebirr" : "cash";
    const note = pickRandom(LANDMARK_NOTES, this.rng);

    return {
      id: `OFR-${this.cityId.toUpperCase()}-${this.offerSeq++}`,
      tripId: `TRP-${++this.tripSeq}`,
      cityId: this.cityId,
      tier,
      pickup,
      dropoff,
      landmarkTag: `${pickup.name} • ${pickup.tag} (${note})`,
      pickupDistanceKm: approach.distanceKm,
      tripDistanceKm: tripRoute.distanceKm,
      payment,
      payoutEtb,
      expiresAt: now + 20000,
      route: tripRoute.coords,
      approachRoute: approach.coords,
    };
  }

  private acceptDriverOffer(offerId: string, now: number): void {
    const offer = this.driverOffer;
    if (!offer || offer.id !== offerId) return;
    const playerState = this.vehicles.get(this.playerVehicleId);
    if (!playerState) return;

    this.driverOffer = null;
    this.emit({ type: "driver.offer", offer: null });

    const etaMinutes = estimateTravelMinutes(offer.tier, offer.tripDistanceKm);
    const trip: Trip = {
      id: offer.tripId,
      cityId: this.cityId,
      tier: offer.tier,
      phase: "DRIVER_ASSIGNED",
      pickup: offer.pickup,
      dropoff: offer.dropoff,
      landmarkNote: offer.landmarkTag,
      route: offer.route,
      approachRoute: offer.approachRoute,
      distanceKm: offer.tripDistanceKm,
      etaMinutes,
      fareEtb: offer.payoutEtb,
      payment: offer.payment,
      vehicleId: playerState.vehicle.id,
      driver: playerState.vehicle.driver,
      plate: playerState.vehicle.plate,
      source: "driver",
      createdAt: now,
      updatedAt: now,
      progress: 0,
      remainingKm: offer.pickupDistanceKm,
      remainingEtaMin: Math.max(1, Math.round(offer.pickupDistanceKm * 2)),
      timeline: [
        { phase: "REQUESTED", at: now - 3000, note: offer.landmarkTag },
        { phase: "DRIVER_ASSIGNED", at: now, note: "Accepted by you" },
      ],
    };

    playerState.vehicle.tripId = trip.id;
    playerState.vehicle.status = "enroute_pickup";

    this.trips.set(trip.id, {
      trip,
      phaseTicks: 0,
      legDurationTicks: 8,
      legElapsedTicks: 0,
      dispatchLatencySec: 2.0,
    });

    this.emit({ type: "trip.updated", trip });
    this.hydrateTripRoute(trip.id, "approachRoute", playerState.vehicle.position, offer.pickup.coords);
    this.hydrateTripRoute(trip.id, "route", offer.pickup.coords, offer.dropoff.coords);
  }

  /**
   * Advances a Driver Mode active job through the 3 single-device demo steps:
   *   1. "Arrived at Pickup" (DRIVER_ASSIGNED/ARRIVING -> snaps to pickup, phase ARRIVING ready to start)
   *   2. "Start Trip"        (ARRIVING -> IN_PROGRESS)
   *   3. "Complete Trip"     (IN_PROGRESS -> COMPLETED, credits earnings)
   */
  private advanceDriverTrip(tripId: string, now: number): void {
    const tState = this.trips.get(tripId);
    if (!tState) return;
    const { trip } = tState;
    const vState = trip.vehicleId ? this.vehicles.get(trip.vehicleId) : undefined;

    if (trip.phase === "DRIVER_ASSIGNED") {
      const arrived = transitionTrip(trip, "ARRIVING", now, `Arrived at ${trip.pickup.name}`);
      tState.trip = {
        ...arrived,
        progress: 1,
        remainingKm: 0,
        remainingEtaMin: 0,
      };
      tState.legElapsedTicks = tState.legDurationTicks;
      if (vState) {
        vState.prevPosition = vState.vehicle.position;
        vState.vehicle.position = trip.pickup.coords;
        vState.vehicle.speedKmh = 0;
      }
      this.emit({ type: "trip.updated", trip: tState.trip });
      return;
    }

    if (trip.phase === "ARRIVING") {
      // If not yet marked arrived at pickup pin, first click marks arrival at pickup;
      // if already at pickup (progress >= 1) or timeline has arrival note, start the trip.
      const alreadyArrivedAtPin =
        trip.progress >= 0.99 ||
        trip.timeline.some((entry) => entry.note?.startsWith("Arrived at "));

      if (!alreadyArrivedAtPin) {
        tState.trip = {
          ...trip,
          progress: 1,
          remainingKm: 0,
          remainingEtaMin: 0,
          updatedAt: now,
          timeline: [
            ...trip.timeline,
            { phase: "ARRIVING", at: now, note: `Arrived at ${trip.pickup.name}` },
          ],
        };
        tState.legElapsedTicks = tState.legDurationTicks;
        if (vState) {
          vState.prevPosition = vState.vehicle.position;
          vState.vehicle.position = trip.pickup.coords;
          vState.vehicle.speedKmh = 0;
        }
        this.emit({ type: "trip.updated", trip: tState.trip });
        return;
      }

      const started = transitionTrip(trip, "IN_PROGRESS", now, `Trip started to ${trip.dropoff.name}`);
      tState.legDurationTicks = clamp(Math.round(trip.distanceKm * 4), 10, 18);
      tState.legElapsedTicks = 0;
      tState.trip = {
        ...started,
        progress: 0,
        remainingKm: trip.distanceKm,
        remainingEtaMin: trip.etaMinutes,
      };
      if (vState) {
        vState.vehicle.status = "on_trip";
      }
      this.emit({ type: "trip.updated", trip: tState.trip });
      return;
    }

    if (trip.phase === "IN_PROGRESS") {
      if (vState) {
        vState.prevPosition = vState.vehicle.position;
        vState.vehicle.position = trip.dropoff.coords;
      }
      this.completeTripInternal(tState, now);
      this.driverOnlineTicks = 0;
    }
  }

  private cancelTrip(tripId: string, reason: string, now: number): void {
    const tState = this.trips.get(tripId);
    if (!tState || !isActiveTripPhase(tState.trip.phase)) return;

    const cancelled = transitionTrip(tState.trip, "CANCELLED", now, reason);
    tState.trip = cancelled;

    if (cancelled.vehicleId) {
      const vState = this.vehicles.get(cancelled.vehicleId);
      if (vState) {
        this.releaseVehicleToGraph(vState, vState.vehicle.position);
      }
    }
    this.emit({ type: "trip.updated", trip: cancelled });
  }

  private reassignTripVehicle(tripId: string, now: number): void {
    const tState = this.trips.get(tripId);
    if (!tState || !isActiveTripPhase(tState.trip.phase)) return;

    const currentVehicleId = tState.trip.vehicleId;
    const replacement = this.findNearestAvailableVehicle(
      tState.trip.tier,
      tState.trip.pickup.coords,
      true,
      currentVehicleId,
    );
    if (!replacement) return;

    if (currentVehicleId) {
      const oldState = this.vehicles.get(currentVehicleId);
      if (oldState) {
        this.releaseVehicleToGraph(oldState, oldState.vehicle.position);
      }
    }

    const approach =
      getCachedRoadRoute(replacement.vehicle.position, tState.trip.pickup.coords) ??
      computeCityRoute(
        this.cityId,
        replacement.vehicle.position,
        tState.trip.pickup.coords,
      );
    replacement.vehicle.tripId = tState.trip.id;
    replacement.vehicle.status =
      tState.trip.phase === "IN_PROGRESS" ? "on_trip" : "enroute_pickup";

    const note = `Reassigned to ${replacement.vehicle.driver.name} (${replacement.vehicle.plate})`;
    tState.trip = {
      ...tState.trip,
      vehicleId: replacement.vehicle.id,
      driver: replacement.vehicle.driver,
      plate: replacement.vehicle.plate,
      approachRoute: approach.coords,
      updatedAt: now,
      timeline: [...tState.trip.timeline, { phase: tState.trip.phase, at: now, note }],
    };

    this.emit({ type: "trip.updated", trip: tState.trip });
    this.hydrateTripRoute(
      tState.trip.id,
      "approachRoute",
      replacement.vehicle.position,
      tState.trip.pickup.coords,
    );
  }

  private addOpsLandmarkNote(tripId: string, note: string, now: number): void {
    const trimmed = note.trim();
    if (!trimmed) return;
    const tState = this.trips.get(tripId);
    if (!tState) return;

    tState.trip = {
      ...tState.trip,
      landmarkNote: trimmed,
      updatedAt: now,
      timeline: [
        ...tState.trip.timeline,
        { phase: tState.trip.phase, at: now, note: `Landmark dispatch note: ${trimmed}` },
      ],
    };
    this.emit({ type: "trip.updated", trip: tState.trip });
  }

  private toggleVehicleFlag(vehicleId: string, forceFlagged: boolean | undefined, now: number): void {
    const vState = this.vehicles.get(vehicleId);
    if (!vState) return;
    const nextFlagged = forceFlagged ?? !vState.vehicle.flagged;
    vState.vehicle.flagged = nextFlagged;

    if (nextFlagged) {
      vState.vehicle.status = "alert";
    } else if (vState.vehicle.tripId) {
      const t = this.trips.get(vState.vehicle.tripId);
      vState.vehicle.status = t?.trip.phase === "IN_PROGRESS" ? "on_trip" : "enroute_pickup";
    } else {
      vState.vehicle.status = "idle";
    }

    if (vState.vehicle.tripId) {
      const tState = this.trips.get(vState.vehicle.tripId);
      if (tState) {
        tState.trip = {
          ...tState.trip,
          updatedAt: now,
          timeline: [
            ...tState.trip.timeline,
            {
              phase: tState.trip.phase,
              at: now,
              note: nextFlagged ? "Ops flagged vehicle alert" : "Ops cleared vehicle alert",
            },
          ],
        };
      }
    }
  }

  private pruneOldBackgroundTrips(now: number): void {
    for (const [id, state] of this.trips.entries()) {
      if (
        state.trip.source === "background" &&
        !isActiveTripPhase(state.trip.phase) &&
        now - state.trip.updatedAt > 25000
      ) {
        this.trips.delete(id);
      }
    }
  }

  private computeKpis(): FleetKpis {
    const vehicles = Array.from(this.vehicles.values()).map((v) => v.vehicle);
    const activeFleet = vehicles.filter((v) => v.status !== "offline").length;
    const activeTrips = Array.from(this.trips.values()).filter((t) =>
      isActiveTripPhase(t.trip.phase),
    );
    const inProgressVolume = activeTrips.reduce((sum, item) => sum + item.trip.fareEtb, 0);
    const avgDispatchSec =
      this.dispatchSamplesSec.reduce((sum, val) => sum + val, 0) /
      Math.max(1, this.dispatchSamplesSec.length);

    return {
      activeFleet,
      totalFleet: vehicles.length,
      tripsInProgress: activeTrips.length,
      avgDispatchSec: Number(avgDispatchSec.toFixed(1)),
      liveVolumeEtb: this.liveVolumeEtb + inProgressVolume,
      completedToday: this.completedToday,
    };
  }

  private buildTelemetryFrames(now: number): VehicleTelemetryFrame[] {
    const frames: VehicleTelemetryFrame[] = [];
    for (const vState of this.vehicles.values()) {
      const { vehicle } = vState;
      frames.push({
        id: vehicle.id,
        from: vState.prevPosition,
        to: vehicle.position,
        fromBearing: vState.prevBearing,
        toBearing: vehicle.bearing,
        t0: now,
        t1: now + TICK_INTERVAL_MS,
        speedKmh: vehicle.speedKmh,
        status: vehicle.status,
        landmark: vehicle.landmark,
        signal: vehicle.signal,
        tripId: vehicle.tripId,
        flagged: vehicle.flagged,
      });
    }
    return frames;
  }

  private serializeVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values()).map((v) => ({ ...v.vehicle }));
  }

  private serializeTrips(): Trip[] {
    return Array.from(this.trips.values())
      .map((t) => t.trip)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private buildSnapshot(now: number): Extract<ServerMessage, { type: "fleet.snapshot" }> {
    return {
      type: "fleet.snapshot",
      cityId: this.cityId,
      vehicles: this.serializeVehicles(),
      frames: this.buildTelemetryFrames(now),
      trips: this.serializeTrips(),
      kpis: this.computeKpis(),
      trafficEnabled: this.trafficEnabled,
      driverOffer: this.driverOffer,
    };
  }

  private buildTick(now: number): Extract<ServerMessage, { type: "fleet.tick" }> {
    return {
      type: "fleet.tick",
      cityId: this.cityId,
      at: now,
      vehicles: this.serializeVehicles(),
      frames: this.buildTelemetryFrames(now),
      trips: this.serializeTrips(),
      kpis: this.computeKpis(),
      driverOffer: this.driverOffer,
    };
  }

  private emit(message: ServerMessage): void {
    for (const listener of this.listeners) {
      listener(message);
    }
  }
}

export function statusLabel(status: VehicleStatus): string {
  switch (status) {
    case "idle":
      return "Available";
    case "enroute_pickup":
      return "Arriving";
    case "on_trip":
      return "On Trip";
    case "offline":
      return "Offline";
    case "alert":
      return "Flagged Alert";
  }
}
