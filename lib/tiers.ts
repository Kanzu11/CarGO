import type { Tier } from "@/types/fleet";

export interface TierMetadata {
  id: Tier;
  name: string;
  tagline: string;
  capacityLabel: string;
  seats: number;
  baseEtb: number;
  perKmEtb: number;
  perMinEtb: number;
  minimumEtb: number;
  avgSpeedKmh: number;
  /** Number of vehicles spawned per city (sums to 20). */
  spawnCount: number;
  /** Height in meters for 3D vehicle extrusion on the map. */
  extrusionHeightM: number;
  /** Footprint length & width in meters (before display scaling). */
  lengthM: number;
  widthM: number;
}

export const TIER_ORDER: ReadonlyArray<Tier> = ["bajaj", "economy", "minivan", "cargo"];

export const TIERS: Record<Tier, TierMetadata> = {
  bajaj: {
    id: "bajaj",
    name: "Bajaj",
    tagline: "Nimble 3-wheeler for local streets",
    capacityLabel: "3 seats",
    seats: 3,
    baseEtb: 20,
    perKmEtb: 12,
    perMinEtb: 1.0,
    minimumEtb: 40,
    avgSpeedKmh: 28,
    spawnCount: 7,
    extrusionHeightM: 1.6,
    lengthM: 2.7,
    widthM: 1.35,
  },
  economy: {
    id: "economy",
    name: "Economy",
    tagline: "Everyday sedan for city rides",
    capacityLabel: "4 seats",
    seats: 4,
    baseEtb: 60,
    perKmEtb: 22,
    perMinEtb: 2.0,
    minimumEtb: 100,
    avgSpeedKmh: 38,
    spawnCount: 7,
    extrusionHeightM: 1.5,
    lengthM: 4.3,
    widthM: 1.8,
  },
  minivan: {
    id: "minivan",
    name: "Minivan",
    tagline: "Groups, airport luggage & family trips",
    capacityLabel: "7 seats",
    seats: 7,
    baseEtb: 90,
    perKmEtb: 28,
    perMinEtb: 2.5,
    minimumEtb: 150,
    avgSpeedKmh: 34,
    spawnCount: 3,
    extrusionHeightM: 1.95,
    lengthM: 4.8,
    widthM: 1.9,
  },
  cargo: {
    id: "cargo",
    name: "Cargo",
    tagline: "Light commercial pickup & box delivery",
    capacityLabel: "1,000 kg",
    seats: 2,
    baseEtb: 150,
    perKmEtb: 40,
    perMinEtb: 3.0,
    minimumEtb: 250,
    avgSpeedKmh: 30,
    spawnCount: 3,
    extrusionHeightM: 2.5,
    lengthM: 5.2,
    widthM: 2.05,
  },
};
