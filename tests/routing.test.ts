import { describe, expect, it } from "vitest";
import { CITIES, CITY_ORDER } from "@/lib/cities";
import { buildOsrmRouteUrl, fetchRoadRoute } from "@/lib/roadRouting";
import { buildAdjacency, computeCityRoute, findShortestNodePath } from "@/lib/routing";

describe("Ethiopian city road graphs & A* routing", () => {
  for (const cityId of CITY_ORDER) {
    const city = CITIES[cityId];

    it(`${city.name}: every graph node has degree >= 2 (no roaming dead ends)`, () => {
      const adj = buildAdjacency(city.graph);
      for (const [nodeId, neighbors] of Object.entries(adj)) {
        expect(
          neighbors.length,
          `${city.name} node ${nodeId} has degree ${neighbors.length}`,
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it(`${city.name}: graph is 100% connected across all nodes`, () => {
      const nodeIds = Object.keys(city.graph.nodes);
      const root = nodeIds[0]!;
      for (const target of nodeIds) {
        const path = findShortestNodePath(city.graph, root, target);
        expect(path.length).toBeGreaterThanOrEqual(1);
        expect(path[0]).toBe(root);
        expect(path[path.length - 1]).toBe(target);
      }
    });

    it(`${city.name}: every landmark pair produces a valid route polyline`, () => {
      for (let i = 0; i < city.landmarks.length; i++) {
        for (let j = i + 1; j < city.landmarks.length; j++) {
          const a = city.landmarks[i]!;
          const b = city.landmarks[j]!;
          const route = computeCityRoute(cityId, a.coords, b.coords);
          expect(route.coords.length).toBeGreaterThanOrEqual(2);
          expect(route.distanceKm).toBeGreaterThan(0.2);
        }
      }
    });
  }

  it("formats OSRM driving route URLs accurately and falls back cleanly in Node/offline", async () => {
    const a = CITIES.addis.landmarks[0]!.coords;
    const b = CITIES.addis.landmarks[1]!.coords;
    const url = buildOsrmRouteUrl(a, b);
    expect(url).toContain("router.project-osrm.org/route/v1/driving/");
    expect(url).toContain("overview=full&geometries=geojson");

    const res = await fetchRoadRoute("addis", a, b);
    expect(res.coords.length).toBeGreaterThanOrEqual(2);
    expect(res.distanceKm).toBeGreaterThan(0.2);
    expect(res.isRealRoad).toBe(false);
  });
});
