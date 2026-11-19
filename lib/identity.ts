import { createPrng, hashSeed, pickRandom } from "@/lib/random";
import type { CityId, Driver } from "@/types/fleet";

const FIRST_NAMES: ReadonlyArray<string> = [
  "Abebe",
  "Dawit",
  "Biniam",
  "Yonas",
  "Samuel",
  "Tewodros",
  "Henok",
  "Mulugeta",
  "Bereket",
  "Robel",
  "Elias",
  "Solomon",
  "Natnael",
  "Fitsum",
  "Girma",
  "Tariku",
  "Kassahun",
  "Ephrem",
  "Haile",
  "Fasil",
  "Tadesse",
  "Zelalem",
  "Ermias",
  "Getachew",
];

const LAST_NAMES: ReadonlyArray<string> = [
  "kebede",
  "Tadesse",
  "Bekele",
  "Tesfaye",
  "Mamo",
  "Alemu",
  "Worku",
  "Assefa",
  "Desta",
  "Hailu",
  "Girma",
  "Mekonnen",
  "Negash",
  "Abate",
  "Bogale",
  "Demissie",
  "Kassa",
  "Lemma",
  "Wondimu",
  "Shiferaw",
];

const REGION_PLATE_PREFIX: Record<CityId, string> = {
  adama: "OR",
  addis: "AA",
  hawassa: "SD",
  worabe: "CE",
};

const CODE_LETTERS = ["A", "B", "C"] as const;

/**
 * Generates a realistic Ethiopian commercial plate (e.g. `OR 3-A45821`, `AA 1-B19403`)
 * and driver identity seeded deterministically by city and index.
 */
export function createSeededDriverAndPlate(
  cityId: CityId,
  index: number,
): { driver: Driver; plate: string } {
  const rng = createPrng(hashSeed(`${cityId}:vehicle:${index}`));
  const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? "Abebe";
  const lastRaw = LAST_NAMES[(index * 3 + 5) % LAST_NAMES.length] ?? "Kebede";
  const last = lastRaw.charAt(0).toUpperCase() + lastRaw.slice(1);

  const prefix = REGION_PLATE_PREFIX[cityId];
  const code = index % 4 === 0 ? "1" : "3"; // Code 1 (Taxi) or Code 3 (Commercial)
  const letter = pickRandom(CODE_LETTERS, rng);
  const digits = String(10000 + Math.floor(rng() * 89999));
  const plate = `${prefix} ${code}-${letter}${digits}`;

  const phoneSuffix = String(1000000 + Math.floor(rng() * 8999999));
  const rating = Number((4.65 + rng() * 0.34).toFixed(2));
  const tripsCompleted = 140 + Math.floor(rng() * 1450);

  return {
    plate,
    driver: {
      id: `DRV-${cityId.toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
      name: `${first} ${last}`,
      phone: `+251 91 ${phoneSuffix.slice(0, 3)} ${phoneSuffix.slice(3, 7)}`,
      rating,
      tripsCompleted,
    },
  };
}
