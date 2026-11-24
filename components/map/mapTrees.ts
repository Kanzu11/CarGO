import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { CITIES } from "@/lib/cities";
import { localizePlaceName } from "@/lib/i18n";
import type { CityId, Locale } from "@/types/fleet";

export interface City3dSceneGeoJson {
  buildings: FeatureCollection<Polygon>;
  trees: FeatureCollection<Polygon>;
  landmarks: FeatureCollection<Point>;
}

const EMPTY_POLYGONS: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [],
};

/**
 * Builds localized landmark anchor points for the given Ethiopian city.
 */
export function buildCityLandmarksGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): FeatureCollection<Point> {
  const city = CITIES[cityId];

  const features: Feature<Point>[] = city.landmarks.map((landmark) => ({
    type: "Feature",
    properties: {
      id: landmark.id,
      name: landmark.name,
      label: localizePlaceName(landmark, locale),
      tag: landmark.tag,
    },
    geometry: {
      type: "Point",
      coordinates: landmark.coords,
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Returns real city landmark points only — zero fake buildings, zero statues,
 * and zero synthetic trees (all 3D buildings come from real OSM + Overture footprints).
 */
export function buildCity3dSceneGeoJson(
  cityId: CityId,
  locale: Locale = "en",
): City3dSceneGeoJson {
  return {
    buildings: EMPTY_POLYGONS,
    trees: EMPTY_POLYGONS,
    landmarks: buildCityLandmarksGeoJson(cityId, locale),
  };
}
