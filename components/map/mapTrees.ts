import type { Feature, FeatureCollection, Point } from "geojson";
import { CITIES } from "@/lib/cities";
import { localizePlaceName } from "@/lib/i18n";
import type { CityId, Locale } from "@/types/fleet";

/**
 * Builds localized landmark anchor points for the given Ethiopian city so key
 * hubs are clearly marked over the high-resolution satellite view.
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
