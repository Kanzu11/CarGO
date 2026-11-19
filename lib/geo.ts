import type { LngLat } from "@/types/fleet";

const EARTH_RADIUS_KM = 6371.0088;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function lerpLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  const u = clamp(t, 0, 1);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

/**
 * Shortest-arc angular interpolation in degrees [0, 360).
 * Prevents 359° -> 1° from spinning 358° backward.
 */
export function lerpAngleDeg(fromDeg: number, toDeg: number, t: number): number {
  const u = clamp(t, 0, 1);
  const a = ((fromDeg % 360) + 360) % 360;
  const b = ((toDeg % 360) + 360) % 360;
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (((a + delta * u) % 360) + 360) % 360;
}

/** Great-circle distance in kilometers between two [lng, lat] points. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * DEG_TO_RAD;
  const dLng = (b[0] - a[0]) * DEG_TO_RAD;
  const lat1 = a[1] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function haversineMeters(a: LngLat, b: LngLat): number {
  return haversineKm(a, b) * 1000;
}

/** Initial compass bearing from `a` to `b` in degrees [0, 360) (0 = North, 90 = East). */
export function bearingDeg(a: LngLat, b: LngLat): number {
  if (a[0] === b[0] && a[1] === b[1]) return 0;
  const lat1 = a[1] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;
  const dLng = (b[0] - a[0]) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD_TO_DEG) % 360 + 360) % 360;
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Cardinal = (typeof CARDINALS)[number];

export function cardinalFromBearing(deg: number): Cardinal {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINALS[index] ?? "N";
}

/** Total length of a polyline in kilometers. */
export function polylineLengthKm(coords: ReadonlyArray<LngLat>): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    if (prev && curr) {
      total += haversineKm(prev, curr);
    }
  }
  return total;
}

/**
 * Samples a position and forward tangent bearing along a polyline at normalized
 * progress `t` in [0, 1].
 */
export function samplePolyline(
  coords: ReadonlyArray<LngLat>,
  t: number,
): { position: LngLat; bearing: number } {
  const first = coords[0];
  if (!first) {
    return { position: [0, 0], bearing: 0 };
  }
  if (coords.length === 1) {
    return { position: first, bearing: 0 };
  }
  const u = clamp(t, 0, 1);
  const segmentLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!;
    const curr = coords[i]!;
    const len = haversineKm(prev, curr);
    segmentLengths.push(len);
    total += len;
  }
  if (total <= 1e-9) {
    const second = coords[1] ?? first;
    return { position: first, bearing: bearingDeg(first, second) };
  }

  const targetDist = total * u;
  let acc = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i]!;
    const a = coords[i]!;
    const b = coords[i + 1]!;
    if (acc + segLen >= targetDist || i === segmentLengths.length - 1) {
      const localT = segLen > 1e-9 ? (targetDist - acc) / segLen : 0;
      return {
        position: lerpLngLat(a, b, localT),
        bearing: bearingDeg(a, b),
      };
    }
    acc += segLen;
  }

  const last = coords[coords.length - 1]!;
  const prev = coords[coords.length - 2] ?? first;
  return { position: last, bearing: bearingDeg(prev, last) };
}
