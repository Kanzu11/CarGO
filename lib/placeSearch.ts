import { CITIES } from "@/lib/cities";
import { haversineMeters } from "@/lib/geo";
import { localizePlaceName } from "@/lib/i18n";
import type { CityId, LngLat, Locale, Place } from "@/types/fleet";

export interface PlaceSearchResult {
  place: Place;
  distanceMeters: number;
}

/**
 * Instant, zero-latency bilingual (`EN` + `አማ`) search across all real landmarks
 * and neighborhoods of the active Ethiopian city, sorted by relevance then proximity.
 */
export function searchLocalPlaces(
  cityId: CityId,
  query: string,
  locale: Locale,
  referenceCoords?: LngLat,
): PlaceSearchResult[] {
  const city = CITIES[cityId];
  const origin = referenceCoords ?? city.center;
  const allPlaces: Place[] = [...city.landmarks, ...city.neighborhoods];
  const q = query.trim().toLowerCase();

  const scored: Array<{ place: Place; distanceMeters: number; score: number }> = [];

  for (const place of allPlaces) {
    const enName = place.name.toLowerCase();
    const amName = localizePlaceName(place, "am").toLowerCase();
    const activeName = localizePlaceName(place, locale).toLowerCase();
    const hood = place.neighborhood.toLowerCase();
    const tag = place.tag.toLowerCase();
    const dist = Math.round(haversineMeters(origin, place.coords));

    if (!q) {
      scored.push({
        place,
        distanceMeters: dist,
        score: place.kind === "landmark" ? 1 : 2,
      });
      continue;
    }

    let score = 99;
    if (activeName.startsWith(q) || enName.startsWith(q) || amName.startsWith(q)) {
      score = 0;
    } else if (hood.startsWith(q)) {
      score = 1;
    } else if (
      activeName.includes(q) ||
      enName.includes(q) ||
      amName.includes(q) ||
      hood.includes(q) ||
      tag.includes(q)
    ) {
      score = 2;
    }

    if (score < 99) {
      scored.push({ place, distanceMeters: dist, score });
    }
  }

  return scored
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.distanceMeters - b.distanceMeters;
    })
    .map(({ place, distanceMeters }) => ({ place, distanceMeters }));
}

interface NominatimItem {
  place_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
}

/**
 * Optional online OpenStreetMap Nominatim lookup bounded strictly to the active
 * Ethiopian city's bounding box (`bounded=1`). Fails silently to `[]` when offline.
 */
export async function searchOnlineCityStreets(
  cityId: CityId,
  query: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3 || typeof window === "undefined") return [];

  const city = CITIES[cityId];
  const [[west, south], [east, north]] = city.bounds;
  const params = new URLSearchParams({
    format: "jsonv2",
    q: `${trimmed}, ${city.name}, Ethiopia`,
    viewbox: `${west},${north},${east},${south}`,
    bounded: "1",
    limit: "4",
    "accept-language": locale === "am" ? "am,en" : "en",
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const items = (await res.json()) as NominatimItem[];
    if (!Array.isArray(items)) return [];

    const results: Place[] = [];
    for (const item of items) {
      const lng = Number(item.lon);
      const lat = Number(item.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const parts = (item.display_name ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const primary = (item.name?.trim() || parts[0] || trimmed).slice(0, 48);
      const neighborhood = (parts[1] || city.name).slice(0, 36);
      results.push({
        id: `osm-${cityId}-${item.place_id ?? `${lng.toFixed(4)}-${lat.toFixed(4)}`}`,
        name: primary,
        neighborhood,
        tag: "Main Gate",
        coords: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
        kind: "custom",
      });
    }
    return results;
  } catch {
    return [];
  }
}
