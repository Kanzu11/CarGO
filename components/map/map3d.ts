import type { LayerSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { Locale } from "@/types/fleet";

export const OPENFREEMAP_POSITRON_STYLE = "https://tiles.openfreemap.org/styles/positron";
export const CARTO_POSITRON_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const AWS_TERRARIUM_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const TERRAIN_SOURCE_ID = "cargo-terrain-dem";
export const HILLSHADE_LAYER_ID = "cargo-hillshade";
export const BUILDINGS_3D_LAYER_ID = "cargo-buildings-3d";

export type CameraPreset =
  | "rider-pickup"
  | "rider-route"
  | "trip-follow"
  | "dispatch-overview"
  | "dispatch-selected"
  | "flat-2d";

export interface CameraPresetConfig {
  pitch: number;
  bearing: number;
  zoom: number;
}

export const CAMERA_PRESETS: Record<CameraPreset, CameraPresetConfig> = {
  "rider-pickup": { pitch: 50, bearing: -12, zoom: 16 },
  "rider-route": { pitch: 45, bearing: -12, zoom: 14.5 },
  "trip-follow": { pitch: 60, bearing: 0, zoom: 16.5 },
  "dispatch-overview": { pitch: 45, bearing: -17, zoom: 13.5 },
  "dispatch-selected": { pitch: 58, bearing: 0, zoom: 16.5 },
  "flat-2d": { pitch: 0, bearing: 0, zoom: 14.5 },
};

/**
 * Locates the first label symbol layer in the active MapLibre style so 3D
 * building extrusions insert cleanly beneath street & landmark labels.
 */
export function findFirstSymbolLayerId(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;

  const textSymbol = layers.find(
    (layer) =>
      layer.type === "symbol" &&
      Boolean((layer.layout as Record<string, unknown> | undefined)?.["text-field"]),
  );
  if (textSymbol) return textSymbol.id;

  return layers.find((layer) => layer.type === "symbol")?.id;
}

interface BuildingSourceRef {
  source: string;
  sourceLayer: string;
}

function detectBuildingSource(layers: ReadonlyArray<LayerSpecification>): BuildingSourceRef | null {
  for (const layer of layers) {
    if (layer.type !== "fill") continue;
    const candidate = layer as LayerSpecification & {
      source?: string;
      "source-layer"?: string;
    };
    const sourceLayer = candidate["source-layer"];
    if (candidate.source && (sourceLayer === "building" || sourceLayer === "buildings")) {
      return { source: candidate.source, sourceLayer };
    }
  }
  return null;
}

/**
 * Adds a flat, unshaded Swiss-grey 3D building extrusion layer derived from the
 * active vector basemap (works seamlessly on OpenFreeMap `openmaptiles/building`
 * and Carto `protomaps/buildings` fallback).
 */
export function apply3dBuildingsLayer(map: MapLibreMap, visible = true): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    setBuildingsVisibility(map, visible);
    return;
  }

  const buildingRef = detectBuildingSource(style.layers);
  if (!buildingRef) return;

  const beforeId = findFirstSymbolLayerId(map);

  map.addLayer(
    {
      id: BUILDINGS_3D_LAYER_ID,
      type: "fill-extrusion",
      source: buildingRef.source,
      "source-layer": buildingRef.sourceLayer,
      minzoom: 12.5,
      layout: {
        visibility: visible ? "visible" : "none",
      },
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], ["get", "height"], 8],
          0,
          "#E2E8F0",
          14,
          "#CBD5E1",
          32,
          "#94A3B8",
          60,
          "#64748B",
        ],
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12.5,
          0,
          14.2,
          ["coalesce", ["get", "render_height"], ["get", "height"], 8],
        ],
        "fill-extrusion-base": [
          "coalesce",
          ["get", "render_min_height"],
          ["get", "min_height"],
          0,
        ],
        "fill-extrusion-opacity": 0.9,
        "fill-extrusion-vertical-gradient": false,
      },
    },
    beforeId,
  );
}

export function setBuildingsVisibility(map: MapLibreMap, visible: boolean): void {
  if (!map.getLayer(BUILDINGS_3D_LAYER_ID)) return;
  map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", visible ? "visible" : "none");
}

/**
 * Enables or disables real elevation relief using AWS Terrarium DEM tiles +
 * subtle industrial hillshade. Fails silently when offline or in Lite mode.
 */
export function applyTerrainAndHillshade(map: MapLibreMap, enabled: boolean): void {
  try {
    if (!enabled) {
      map.setTerrain(null);
      if (map.getLayer(HILLSHADE_LAYER_ID)) {
        map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", "none");
      }
      return;
    }

    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        tiles: [AWS_TERRARIUM_TILES],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
      });
    }

    if (!map.getLayer(HILLSHADE_LAYER_ID)) {
      const beforeId = map.getLayer(BUILDINGS_3D_LAYER_ID)
        ? BUILDINGS_3D_LAYER_ID
        : findFirstSymbolLayerId(map);

      map.addLayer(
        {
          id: HILLSHADE_LAYER_ID,
          type: "hillshade",
          source: TERRAIN_SOURCE_ID,
          layout: { visibility: "visible" },
          paint: {
            "hillshade-shadow-color": "#111827",
            "hillshade-highlight-color": "#FFFFFF",
            "hillshade-accent-color": "#6B7280",
            "hillshade-exaggeration": 0.2,
          },
        },
        beforeId,
      );
    } else {
      map.setLayoutProperty(HILLSHADE_LAYER_ID, "visibility", "visible");
    }

    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.35 });
  } catch {
    // Silent fallback when DEM source is unavailable or WebGL context rejects terrain
  }
}

/**
 * Applies crisp daylight highland sky (no haze glow) and warm directional sun
 * lighting for architectural facade & tree crown contrast.
 */
export function applyFlatSkyAndLight(map: MapLibreMap, is3d: boolean): void {
  try {
    map.setSky({
      "sky-color": "#E0F2FE",
      "horizon-color": "#F0F9FF",
      "fog-color": "#F4F6F2",
      "sky-horizon-blend": 0,
      "horizon-fog-blend": 0,
      "atmosphere-blend": 0,
    });
    map.setLight({
      anchor: "map",
      intensity: is3d ? 0.45 : 0.14,
      color: "#FFFBEB",
      position: [1.35, 205, 42],
    });
  } catch {
    // Ignore on styles or contexts that do not support sky/light mutations
  }
}

/**
 * Recolors greyscale Positron basemap layers (OpenFreeMap / Carto) into a
 * vibrant, living Ethiopian urban palette: azure water, lush parks, warm
 * arterial highways, and crisp residential streets.
 */
export function applyVibrantMapTheme(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  for (const layer of layers) {
    if (layer.id.startsWith("cargo-")) continue;

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#F4F6F2");
        continue;
      }

      if (layer.type === "fill") {
        if (/water|ocean|lake|river|basin/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "fill-color", "#BAE6FD");
          map.setPaintProperty(layer.id, "fill-outline-color", "#7DD3FC");
          continue;
        }
        if (/park|wood|forest|grass|green|vegetation|garden|pitch|cemetery|national_park/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "fill-color", "#DCFCE7");
          map.setPaintProperty(layer.id, "fill-opacity", 0.85);
          continue;
        }
        if (/landcover|landuse/i.test(layer.id) && /residential|suburb/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "fill-color", "#F1F5F9");
        }
        continue;
      }

      if (layer.type === "line") {
        if (/waterway|river|stream|canal/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", "#38BDF8");
          continue;
        }
        if (/highway|motorway|trunk|primary/i.test(layer.id)) {
          if (/casing/i.test(layer.id)) {
            map.setPaintProperty(layer.id, "line-color", "#F59E0B");
            map.setPaintProperty(layer.id, "line-opacity", 0.55);
          } else {
            map.setPaintProperty(layer.id, "line-color", "#FEF08A");
          }
          continue;
        }
        if (/secondary|tertiary/i.test(layer.id)) {
          map.setPaintProperty(
            layer.id,
            "line-color",
            /casing/i.test(layer.id) ? "#CBD5E1" : "#FFFFFF",
          );
        }
      }
    } catch {
      // Ignore individual layers whose style spec disallows a given paint mutation
    }
  }
}

export function applyCameraMode(
  map: MapLibreMap,
  is3d: boolean,
  targetPitch: number,
  targetBearing: number,
): void {
  map.easeTo({
    pitch: is3d ? targetPitch : 0,
    bearing: is3d ? targetBearing : 0,
    duration: 450,
  });
}

const CARTO_GLYPH_RE =
  /^(https:\/\/tiles\.basemaps\.cartocdn\.com\/.+\/fonts\/)([^/]+)\/(\d+-\d+\.pbf)(.*)$/i;

/**
 * Carto Positron's style requests `Noto Sans Italic` / `Open Sans Italic` for
 * Ethiopic codepoint range `4608-4863.pbf`, which returns 404 on Carto's CDN.
 * Carto DOES serve all non-ASCII ranges under `Noto Sans Regular`.
 */
export function rewriteCartoGlyphUrl(url: string): string {
  const match = CARTO_GLYPH_RE.exec(url);
  if (!match) return url;
  const [, prefix, fontSegment, rangeFile, suffix] = match;
  if (!prefix || !rangeFile) return url;
  if (rangeFile === "0-255.pbf" || fontSegment === "Noto%20Sans%20Regular") {
    return url;
  }
  return `${prefix}Noto%20Sans%20Regular/${rangeFile}${suffix ?? ""}`;
}

/**
 * Updates basemap label symbol layers to prefer Amharic (`name:am` / `name:nonlatin`)
 * or English (`name:en` / `name:latin`) dynamically when toggling locale.
 */
export function applyMapLanguage(map: MapLibreMap, locale: Locale): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  const textExpr: [
    "coalesce",
    ["get", string],
    ["get", string],
    ["get", string],
    ["get", string],
  ] =
    locale === "am"
      ? [
          "coalesce",
          ["get", "name:am"],
          ["get", "name:nonlatin"],
          ["get", "name"],
          ["get", "name:en"],
        ]
      : [
          "coalesce",
          ["get", "name:en"],
          ["get", "name_en"],
          ["get", "name:latin"],
          ["get", "name"],
        ];

  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    if (
      layer.id.startsWith("cargo-") ||
      layer.id.includes("housenumber") ||
      layer.id.includes("shield") ||
      layer.id.includes("ref")
    ) {
      continue;
    }
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (!layout || !("text-field" in layout)) continue;

    try {
      map.setLayoutProperty(layer.id, "text-field", textExpr);
    } catch {
      // Ignore layers whose vector schema rejects custom text-field expressions
    }
  }
}
