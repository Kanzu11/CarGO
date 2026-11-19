export type CityId = "adama" | "addis" | "hawassa" | "worabe";

export type Locale = "en" | "am";

export type LocationSource = "real" | "simulated";

export type GeoPermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface UserGeoPosition {
  coords: LngLat;
  accuracyM: number;
  updatedAt: number;
  nearestCityId: CityId;
  isWithinCity: boolean;
}

export type Tier = "bajaj" | "economy" | "minivan" | "cargo";

export type VehicleStatus = "idle" | "enroute_pickup" | "on_trip" | "offline" | "alert";

export type TripPhase =
  | "REQUESTED"
  | "SEARCHING"
  | "DRIVER_ASSIGNED"
  | "ARRIVING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod = "cash" | "telebirr" | "cbe_birr";

export type AppMode = "rider" | "driver";

export type RiderStep = "location" | "tier" | "trip";

export type LandmarkChip = "Main Gate" | "Beside Bank" | "Roundabout" | "Taxi Stand";

export const LANDMARK_CHIPS: ReadonlyArray<LandmarkChip> = [
  "Main Gate",
  "Beside Bank",
  "Roundabout",
  "Taxi Stand",
];

/** [longitude, latitude] in WGS84 degrees (MapLibre convention). */
export type LngLat = [number, number];

export interface Place {
  id: string;
  name: string;
  neighborhood: string;
  /** Short landmark descriptor e.g. "Main Gate", "Roundabout", "Terminal". */
  tag: string;
  coords: LngLat;
  kind: "landmark" | "neighborhood" | "custom";
}

export interface RoadGraph {
  /** Map of node ID to [lng, lat]. */
  nodes: Record<string, LngLat>;
  /** Undirected road segments connecting pairs of node IDs. */
  edges: ReadonlyArray<readonly [string, string]>;
}

export interface CityConfig {
  id: CityId;
  name: string;
  region: string;
  platePrefix: string;
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
  bounds: [LngLat, LngLat];
  landmarks: ReadonlyArray<Place>;
  neighborhoods: ReadonlyArray<Place>;
  graph: RoadGraph;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  tripsCompleted: number;
}

export interface Vehicle {
  id: string;
  cityId: CityId;
  tier: Tier;
  status: VehicleStatus;
  position: LngLat;
  bearing: number;
  speedKmh: number;
  signal: 0 | 1 | 2 | 3 | 4;
  driver: Driver;
  plate: string;
  landmark: string;
  tripId?: string;
  flagged?: boolean;
  isPlayerDriver?: boolean;
}

/**
 * Authoritative 1 Hz segment frame emitted by the simulator or WebSocket server.
 * The 60fps requestAnimationFrame loop interpolates position & heading between
 * `from` and `to` over `[t0, t1]` without triggering React re-renders.
 */
export interface VehicleTelemetryFrame {
  id: string;
  from: LngLat;
  to: LngLat;
  fromBearing: number;
  toBearing: number;
  t0: number;
  t1: number;
  speedKmh: number;
  status: VehicleStatus;
  landmark: string;
  signal: 0 | 1 | 2 | 3 | 4;
  tripId?: string;
  flagged?: boolean;
}

export interface TripTimelineEntry {
  phase: TripPhase;
  at: number;
  note?: string;
}

export interface Trip {
  id: string;
  cityId: CityId;
  tier: Tier;
  phase: TripPhase;
  pickup: Place;
  dropoff: Place;
  landmarkChip?: LandmarkChip;
  landmarkNote?: string;
  /** Route polyline from pickup to dropoff along city road graph. */
  route: LngLat[];
  /** Approach polyline from assigned vehicle to pickup. */
  approachRoute?: LngLat[];
  distanceKm: number;
  etaMinutes: number;
  fareEtb: number;
  payment: PaymentMethod;
  vehicleId?: string;
  driver?: Driver;
  plate?: string;
  source: "rider" | "driver" | "background";
  createdAt: number;
  updatedAt: number;
  /** Normalized progress along current active leg (0..1). */
  progress: number;
  remainingKm: number;
  remainingEtaMin: number;
  timeline: TripTimelineEntry[];
  rating?: number;
}

export interface DriverJobOffer {
  id: string;
  tripId: string;
  cityId: CityId;
  tier: Tier;
  pickup: Place;
  dropoff: Place;
  landmarkTag: string;
  pickupDistanceKm: number;
  tripDistanceKm: number;
  payment: PaymentMethod;
  payoutEtb: number;
  expiresAt: number;
  route: LngLat[];
  approachRoute: LngLat[];
}

export interface FleetKpis {
  activeFleet: number;
  totalFleet: number;
  tripsInProgress: number;
  avgDispatchSec: number;
  liveVolumeEtb: number;
  completedToday: number;
}

export type ConnStatus = "connected" | "reconnecting" | "offline";

export type ServerMessage =
  | {
      type: "fleet.snapshot";
      cityId: CityId;
      vehicles: Vehicle[];
      frames: VehicleTelemetryFrame[];
      trips: Trip[];
      kpis: FleetKpis;
      trafficEnabled: boolean;
      driverOffer: DriverJobOffer | null;
    }
  | {
      type: "fleet.tick";
      cityId: CityId;
      at: number;
      vehicles: Vehicle[];
      frames: VehicleTelemetryFrame[];
      trips: Trip[];
      kpis: FleetKpis;
      driverOffer: DriverJobOffer | null;
    }
  | {
      type: "trip.updated";
      trip: Trip;
    }
  | {
      type: "driver.offer";
      offer: DriverJobOffer | null;
    };

export type ClientMessage =
  | {
      type: "city.switch";
      cityId: CityId;
    }
  | {
      type: "trip.request";
      pickup: Place;
      dropoff: Place;
      tier: Tier;
      payment: PaymentMethod;
      landmarkChip?: LandmarkChip;
      landmarkNote?: string;
    }
  | {
      type: "trip.cancel";
      tripId: string;
      reason?: string;
    }
  | {
      type: "trip.rate";
      tripId: string;
      rating: number;
    }
  | {
      type: "driver.online";
      online: boolean;
    }
  | {
      type: "job.accept";
      offerId: string;
    }
  | {
      type: "job.decline";
      offerId: string;
    }
  | {
      type: "job.advance";
      tripId: string;
    }
  | {
      type: "ops.reassign";
      tripId: string;
    }
  | {
      type: "ops.note";
      tripId: string;
      note: string;
    }
  | {
      type: "ops.flag";
      vehicleId: string;
      flagged?: boolean;
    }
  | {
      type: "sim.traffic";
      enabled: boolean;
    };
