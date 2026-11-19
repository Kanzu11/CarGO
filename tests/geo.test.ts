import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  cardinalFromBearing,
  haversineKm,
  lerpAngleDeg,
  polylineLengthKm,
  samplePolyline,
} from "@/lib/geo";
import type { LngLat } from "@/types/fleet";

describe("geo utilities", () => {
  it("computes realistic haversine distances in Adama", () => {
    const postaBet: LngLat = [39.2692, 8.5414];
    const astuGate: LngLat = [39.2904, 8.5632];
    const km = haversineKm(postaBet, astuGate);
    expect(km).toBeGreaterThan(3.0);
    expect(km).toBeLessThan(3.8);
  });

  it("computes cardinal bearings accurately", () => {
    const origin: LngLat = [39.27, 8.54];
    const north: LngLat = [39.27, 8.55];
    const east: LngLat = [39.28, 8.54];
    const south: LngLat = [39.27, 8.53];
    const west: LngLat = [39.26, 8.54];

    expect(Math.round(bearingDeg(origin, north))).toBe(0);
    expect(Math.round(bearingDeg(origin, east))).toBe(90);
    expect(Math.round(bearingDeg(origin, south))).toBe(180);
    expect(Math.round(bearingDeg(origin, west))).toBe(270);

    expect(cardinalFromBearing(5)).toBe("N");
    expect(cardinalFromBearing(92)).toBe("E");
    expect(cardinalFromBearing(225)).toBe("SW");
  });

  it("interpolates angles along the shortest arc across 0/360", () => {
    const mid = lerpAngleDeg(350, 10, 0.5);
    expect(mid === 0 || mid === 360).toBe(true);
    const reverseMid = lerpAngleDeg(10, 350, 0.5);
    expect(reverseMid === 0 || reverseMid === 360).toBe(true);
  });

  it("samples polylines accurately from start to finish", () => {
    const line: LngLat[] = [
      [39.26, 8.53],
      [39.27, 8.54],
      [39.28, 8.55],
    ];
    expect(polylineLengthKm(line)).toBeGreaterThan(2.5);

    const start = samplePolyline(line, 0);
    const mid = samplePolyline(line, 0.5);
    const end = samplePolyline(line, 1);

    expect(start.position).toEqual(line[0]);
    expect(end.position).toEqual(line[2]);
    expect(mid.position[0]).toBeCloseTo(39.27, 3);
    expect(mid.position[1]).toBeCloseTo(8.54, 3);
  });
});
