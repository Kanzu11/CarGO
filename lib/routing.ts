import { getCityConfig } from "@/lib/cities";
import { haversineKm, polylineLengthKm } from "@/lib/geo";
import type { CityId, LngLat, RoadGraph } from "@/types/fleet";

/**
 * Road winding multiplier applied to polyline length to reflect Ethiopian
 * urban curb geometry and roundabout turns.
 */
export const ROAD_DISTANCE_FACTOR = 1.15;

export interface RouteResult {
  nodeIds: string[];
  coords: LngLat[];
  distanceKm: number;
}

/** Builds an adjacency list `{ nodeId -> neighborIds[] }` from an undirected RoadGraph. */
export function buildAdjacency(graph: RoadGraph): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const nodeId of Object.keys(graph.nodes)) {
    adj[nodeId] = [];
  }
  for (const [a, b] of graph.edges) {
    if (!adj[a] || !adj[b]) continue;
    if (!adj[a].includes(b)) adj[a].push(b);
    if (!adj[b].includes(a)) adj[b].push(a);
  }
  return adj;
}

/** Snaps any [lng, lat] point to the closest node ID in the road graph. */
export function snapToNearestNode(graph: RoadGraph, point: LngLat): string {
  const entries = Object.entries(graph.nodes);
  if (entries.length === 0) {
    throw new Error("RoadGraph has no nodes");
  }
  let bestId = entries[0]![0];
  let bestDist = haversineKm(point, entries[0]![1]);

  for (let i = 1; i < entries.length; i++) {
    const [id, coords] = entries[i]!;
    const dist = haversineKm(point, coords);
    if (dist < bestDist) {
      bestId = id;
      bestDist = dist;
    }
  }
  return bestId;
}

/**
 * A* shortest-path search between two node IDs on a RoadGraph using great-circle
 * haversine distance as an admissible heuristic.
 */
export function findShortestNodePath(
  graph: RoadGraph,
  startNodeId: string,
  goalNodeId: string,
): string[] {
  if (!graph.nodes[startNodeId] || !graph.nodes[goalNodeId]) {
    return [];
  }
  if (startNodeId === goalNodeId) {
    return [startNodeId];
  }

  const adj = buildAdjacency(graph);
  const goalCoords = graph.nodes[goalNodeId]!;

  const openSet = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startNodeId, 0]]);
  const fScore = new Map<string, number>([
    [startNodeId, haversineKm(graph.nodes[startNodeId]!, goalCoords)],
  ]);

  while (openSet.size > 0) {
    let current: string | null = null;
    let lowestF = Infinity;
    for (const candidate of openSet) {
      const score = fScore.get(candidate) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        current = candidate;
      }
    }

    if (!current) break;
    if (current === goalNodeId) {
      const path: string[] = [current];
      let cursor = current;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor)!;
        path.unshift(cursor);
      }
      return path;
    }

    openSet.delete(current);
    const currentCoords = graph.nodes[current]!;
    const currentG = gScore.get(current) ?? Infinity;

    for (const neighbor of adj[current] ?? []) {
      const neighborCoords = graph.nodes[neighbor];
      if (!neighborCoords) continue;
      const tentativeG = currentG + haversineKm(currentCoords, neighborCoords);
      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + haversineKm(neighborCoords, goalCoords));
        openSet.add(neighbor);
      }
    }
  }

  return [startNodeId, goalNodeId];
}

function sameCoord(a: LngLat, b: LngLat): boolean {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

/**
 * Computes a road-following route between any two points in a city.
 * Includes short off-graph connectors when origin or destination is tapped off-node.
 */
export function computeCityRoute(
  cityId: CityId,
  origin: LngLat,
  destination: LngLat,
): RouteResult {
  const { graph } = getCityConfig(cityId);
  const startNode = snapToNearestNode(graph, origin);
  const endNode = snapToNearestNode(graph, destination);
  const nodeIds = findShortestNodePath(graph, startNode, endNode);
  const graphCoords = nodeIds.map((id) => graph.nodes[id]!);

  const coords: LngLat[] = [];
  const firstNodeCoord = graphCoords[0];
  if (!firstNodeCoord || !sameCoord(origin, firstNodeCoord)) {
    coords.push(origin);
  }
  for (const pt of graphCoords) {
    const prev = coords[coords.length - 1];
    if (!prev || !sameCoord(prev, pt)) {
      coords.push(pt);
    }
  }
  const lastCoord = coords[coords.length - 1];
  if (!lastCoord || !sameCoord(lastCoord, destination)) {
    coords.push(destination);
  }
  if (coords.length === 1) {
    coords.push(destination);
  }

  const rawKm = polylineLengthKm(coords);
  const distanceKm = Number(Math.max(0.25, rawKm * ROAD_DISTANCE_FACTOR).toFixed(2));

  return {
    nodeIds,
    coords,
    distanceKm,
  };
}
