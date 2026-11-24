import { addProtocol, type Map as MapLibreMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import type { Locale } from "@/types/fleet";

export const OPENFREEMAP_POSITRON_STYLE = "https://tiles.openfreemap.org/styles/positron";
export const CARTO_POSITRON_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const ESRI_WORLD_IMAGERY_TILES =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const OVERTURE_BUILDINGS_PMTILES =
  "https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-11-18.0/buildings.pmtiles";
export const AWS_TERRARIUM_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const SATELLITE_MAX_ZOOM = 17;
export const MAP_MIN_ZOOM = 11.5;
export const MAP_MAX_ZOOM = 17.2;

export const SATELLITE_SOURCE_ID = "cargo-satellite-imagery";
export const SATELLITE_LAYER_ID = "cargo-satellite-layer";
export const OVERTURE_BUILDINGS_SOURCE_ID = "cargo-overture-buildings";
export const TERRAIN_SOURCE_ID = "cargo-terrain-dem";
export const HILLSHADE_LAYER_ID = "cargo-hillshade";
export const BUILDINGS_3D_LAYER_ID = "cargo-buildings-3d";
export const OVERTURE_BUILDINGS_PARTS_LAYER_ID = "cargo-overture-building-parts-3d";

let pmtilesRegistered = false;

/** Registers MapLibre's global `pmtiles://` protocol handler once per client runtime. */
export function ensurePmtilesProtocol(): void {
  if (pmtilesRegistered) return;
  pmtilesRegistered = true;
  const protocol = new Protocol();
  addProtocol("pmtiles", (params, abortController) => protocol.tile(params, abortController));
}

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

/**
 * Mounts real Overture Maps 3D building & building_part footprints (Google Open
 * Buildings + Microsoft ML + OSM) via PMTiles so every city—including Worabe—
 * renders real 3D building extrusions matched to actual satellite rooftops.
 */
export function apply3dBuildingsLayer(map: MapLibreMap, visible = true): void {
  try {
    ensurePmtilesProtocol();

    if (!map.getSource(OVERTURE_BUILDINGS_SOURCE_ID)) {
      map.addSource(OVERTURE_BUILDINGS_SOURCE_ID, {
        type: "vector",
        url: `pmtiles://${OVERTURE_BUILDINGS_PMTILES}`,
        maxzoom: 14,
        attribution: "Overture Maps Foundation",
      });
    }

    const beforeId = findFirstSymbolLayerId(map);

    const buildingColorExpr = [
      "coalesce",
      ["get", "facade_color"],
      [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "height"], ["*", ["coalesce", ["get", "num_floors"], 2], 3.5], 7.5],
        0,
        "#EAE4DC",
        9,
        "#DFD8CE",
        18,
        "#CBD5E1",
        36,
        "#94A3B8",
        65,
        "#64748B",
      ],
    ] as unknown as string;

    const buildingHeightExpr = [
      "interpolate",
      ["linear"],
      ["zoom"],
      12.5,
      0,
      13.6,
      ["coalesce", ["get", "height"], ["*", ["coalesce", ["get", "num_floors"], 2], 3.5], 7.5],
    ] as unknown as number;

    const buildingBaseExpr = ["coalesce", ["get", "min_height"], 0] as unknown as number;

    if (!map.getLayer(BUILDINGS_3D_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_3D_LAYER_ID,
          type: "fill-extrusion",
          source: OVERTURE_BUILDINGS_SOURCE_ID,
          "source-layer": "building",
          minzoom: 12.5,
          filter: ["!=", ["get", "has_parts"], true],
          layout: {
            visibility: visible ? "visible" : "none",
          },
          paint: {
            "fill-extrusion-color": buildingColorExpr,
            "fill-extrusion-height": buildingHeightExpr,
            "fill-extrusion-base": buildingBaseExpr,
            "fill-extrusion-opacity": 0.9,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(OVERTURE_BUILDINGS_PARTS_LAYER_ID)) {
      map.addLayer(
        {
          id: OVERTURE_BUILDINGS_PARTS_LAYER_ID,
          type: "fill-extrusion",
          source: OVERTURE_BUILDINGS_SOURCE_ID,
          "source-layer": "building_part",
          minzoom: 13,
          layout: {
            visibility: visible ? "visible" : "none",
          },
          paint: {
            "fill-extrusion-color": buildingColorExpr,
            "fill-extrusion-height": buildingHeightExpr,
            "fill-extrusion-base": buildingBaseExpr,
            "fill-extrusion-opacity": 0.92,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    }

    setBuildingsVisibility(map, visible);
  } catch {
    // Graceful fallback if style/PMTiles source rejects initialization
  }
}

export function setBuildingsVisibility(map: MapLibreMap, visible: boolean): void {
  const vis = visible ? "visible" : "none";
  if (map.getLayer(BUILDINGS_3D_LAYER_ID)) {
    map.setLayoutProperty(BUILDINGS_3D_LAYER_ID, "visibility", vis);
  }
  if (map.getLayer(OVERTURE_BUILDINGS_PARTS_LAYER_ID)) {
    map.setLayoutProperty(OVERTURE_BUILDINGS_PARTS_LAYER_ID, "visibility", vis);
  }
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
 * Clean dark-slate horizon sky matching high-resolution satellite imagery.
 */
export function applyFlatSkyAndLight(map: MapLibreMap, is3d: boolean): void {
  try {
    map.setSky({
      "sky-color": "#0F172A",
      "horizon-color": "#1E293B",
      "fog-color": "#0F172A",
      "sky-horizon-blend": 0,
      "horizon-fog-blend": 0,
      "atmosphere-blend": 0,
    });
    map.setLight({
      anchor: "map",
      intensity: is3d ? 0.65 : 0.16,
      color: "#FFF7ED",
      position: [1.5, 195, 34],
    });
  } catch {
    // Ignore on styles or contexts that do not support sky/light mutations
  }
}

/**
 * Transforms the vector Positron basemap into a crisp Hybrid Satellite View:
 * mounts Esri World Imagery aerial tiles (capped at zoom 17 so MapLibre
 * overzooms clean photography instead of fetching missing-data tiles) beneath
 * translucent roads and high-contrast white haloed labels.
 */
export function applySatelliteHybridTheme(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  if (!map.getSource(SATELLITE_SOURCE_ID)) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: "raster",
      tiles: [ESRI_WORLD_IMAGERY_TILES],
      tileSize: 256,
      maxzoom: SATELLITE_MAX_ZOOM,
      attribution: "Esri, Maxar, Earthstar Geographics",
    });
  }

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    const firstNonBgLayer = layers.find((layer) => layer.type !== "background")?.id;
    map.addLayer(
      {
        id: SATELLITE_LAYER_ID,
        type: "raster",
        source: SATELLITE_SOURCE_ID,
        paint: {
          "raster-opacity": 1,
          "raster-fade-duration": 150,
        },
      },
      firstNonBgLayer,
    );
  }

  for (const layer of layers) {
    if (layer.id.startsWith("cargo-")) continue;

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#0F172A");
        continue;
      }

      if (layer.type === "fill" || layer.type === "fill-extrusion") {
        map.setLayoutProperty(layer.id, "visibility", "none");
        continue;
      }

      if (layer.type === "line") {
        if (/boundary|admin|rail|ferry|aeroway|footway|path|track|service|building/i.test(layer.id)) {
          map.setLayoutProperty(layer.id, "visibility", "none");
          continue;
        }
        if (/waterway|river|stream|canal/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", "#38BDF8");
          map.setPaintProperty(layer.id, "line-opacity", 0.5);
          continue;
        }
        if (/highway|motorway|trunk|primary/i.test(layer.id)) {
          if (/casing/i.test(layer.id)) {
            map.setPaintProperty(layer.id, "line-color", "#09090B");
            map.setPaintProperty(layer.id, "line-opacity", 0.35);
          } else {
            map.setPaintProperty(layer.id, "line-color", "#FDE047");
            map.setPaintProperty(layer.id, "line-opacity", 0.45);
          }
          continue;
        }
        if (/casing/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", "#09090B");
          map.setPaintProperty(layer.id, "line-opacity", 0.22);
        } else {
          map.setPaintProperty(layer.id, "line-color", "#FFFFFF");
          map.setPaintProperty(layer.id, "line-opacity", 0.28);
        }
        continue;
      }

      if (layer.type === "symbol") {
        const layout = layer.layout as Record<string, unknown> | undefined;
        if (layout && "text-field" in layout) {
          map.setPaintProperty(layer.id, "text-color", "#FFFFFF");
          map.setPaintProperty(layer.id, "text-halo-color", "#09090B");
          map.setPaintProperty(layer.id, "text-halo-width", 1.8);
          map.setPaintProperty(layer.id, "text-halo-blur", 0.5);
        }
      }
    } catch {
      // Ignore individual layers whose style spec disallows a given property
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
