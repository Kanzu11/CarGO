import { addProtocol, type LayerSpecification, type Map as MapLibreMap } from "maplibre-gl";
import { Protocol } from "pmtiles";
import type { Locale, MapStyleMode } from "@/types/fleet";

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

export const BUILDINGS_AO_LAYER_ID = "cargo-buildings-ao";
export const BUILDINGS_PLINTH_LAYER_ID = "cargo-buildings-plinth";
export const OSM_BUILDINGS_3D_LAYER_ID = "cargo-osm-buildings-3d";
export const BUILDINGS_3D_LAYER_ID = "cargo-buildings-3d";
export const OVERTURE_BUILDINGS_PARTS_LAYER_ID = "cargo-overture-building-parts-3d";
export const BUILDINGS_ROOF_CAP_LAYER_ID = "cargo-buildings-roof-cap";

const ALL_3D_BUILDING_LAYERS = [
  BUILDINGS_AO_LAYER_ID,
  BUILDINGS_PLINTH_LAYER_ID,
  OSM_BUILDINGS_3D_LAYER_ID,
  BUILDINGS_3D_LAYER_ID,
  OVERTURE_BUILDINGS_PARTS_LAYER_ID,
  BUILDINGS_ROOF_CAP_LAYER_ID,
] as const;

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
  "rider-pickup": { pitch: 56, bearing: -12, zoom: 16 },
  "rider-route": { pitch: 48, bearing: -12, zoom: 14.5 },
  "trip-follow": { pitch: 60, bearing: 0, zoom: 16.5 },
  "dispatch-overview": { pitch: 50, bearing: -17, zoom: 13.8 },
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
 * Mounts real OSM 3D extrusions (from z12+) AND Overture Maps z14 `building` /
 * `building_part` extrusions with ground ambient-occlusion shadow and solid sunlit
 * architectural facades. (Note: never wrap `["get", ...]` in `["to-number", ...]`
 * inside `coalesce`, because MapLibre converts `null` to `0` and flattens heights!)
 */
export function apply3dBuildingsLayer(map: MapLibreMap, visible = true): void {
  try {
    ensurePmtilesProtocol();

    const beforeId = findFirstSymbolLayerId(map);
    const styleLayers = map.getStyle()?.layers;

    const buildingColorExpr = [
      "coalesce",
      ["get", "facade_color"],
      [
        "interpolate",
        ["linear"],
        [
          "coalesce",
          ["get", "render_height"],
          ["get", "height"],
          ["*", ["coalesce", ["get", "num_floors"], 2], 3.6],
          10,
        ],
        0,
        "#F2ECE1",
        9,
        "#E6DEC8",
        18,
        "#D6DEE8",
        34,
        "#94A3B8",
        60,
        "#64748B",
      ],
    ] as unknown as string;

    // 1. Instant OSM vector 3D buildings + ground AO shadow
    if (styleLayers) {
      const osmRef = detectBuildingSource(styleLayers);
      if (osmRef) {
        if (!map.getLayer(BUILDINGS_AO_LAYER_ID)) {
          map.addLayer(
            {
              id: BUILDINGS_AO_LAYER_ID,
              type: "fill",
              source: osmRef.source,
              "source-layer": osmRef.sourceLayer,
              minzoom: 13,
              layout: { visibility: visible ? "visible" : "none" },
              paint: {
                "fill-color": "#09090B",
                "fill-opacity": 0.28,
                "fill-translate": [3, 3],
                "fill-translate-anchor": "viewport",
              },
            },
            beforeId,
          );
        }

        if (!map.getLayer(OSM_BUILDINGS_3D_LAYER_ID)) {
          map.addLayer(
            {
              id: OSM_BUILDINGS_3D_LAYER_ID,
              type: "fill-extrusion",
              source: osmRef.source,
              "source-layer": osmRef.sourceLayer,
              minzoom: 12,
              layout: {
                visibility: visible ? "visible" : "none",
              },
              paint: {
                "fill-extrusion-color": buildingColorExpr,
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  12,
                  0,
                  13.1,
                  ["coalesce", ["get", "render_height"], ["get", "height"], 10.5],
                ],
                "fill-extrusion-base": [
                  "coalesce",
                  ["get", "render_min_height"],
                  ["get", "min_height"],
                  0,
                ],
                "fill-extrusion-opacity": 0.96,
                "fill-extrusion-vertical-gradient": true,
              },
            },
            beforeId,
          );
        }
      }
    }

    // 2. Overture z14 building & building_part footprints across all 4 Ethiopian cities
    if (!map.getSource(OVERTURE_BUILDINGS_SOURCE_ID)) {
      map.addSource(OVERTURE_BUILDINGS_SOURCE_ID, {
        type: "vector",
        url: `pmtiles://${OVERTURE_BUILDINGS_PMTILES}`,
        minzoom: 14,
        maxzoom: 14,
        attribution: "Overture Maps Foundation",
      });
    }

    const overtureHeightScalar = [
      "coalesce",
      ["get", "height"],
      ["*", ["coalesce", ["get", "num_floors"], 2], 3.6],
      9.5,
    ];

    const overtureHeightExpr = [
      "interpolate",
      ["linear"],
      ["zoom"],
      13.8,
      0,
      14.3,
      overtureHeightScalar,
    ] as unknown as number;

    const overtureBaseExpr = ["coalesce", ["get", "min_height"], 0] as unknown as number;

    if (!map.getLayer(BUILDINGS_PLINTH_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_PLINTH_LAYER_ID,
          type: "fill-extrusion",
          source: OVERTURE_BUILDINGS_SOURCE_ID,
          "source-layer": "building",
          minzoom: 14,
          filter: ["!=", ["get", "has_parts"], true],
          layout: { visibility: visible ? "visible" : "none" },
          paint: {
            "fill-extrusion-color": "#C7BFAF",
            "fill-extrusion-base": 0,
            "fill-extrusion-height": 1.6,
            "fill-extrusion-opacity": 0.98,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(BUILDINGS_3D_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_3D_LAYER_ID,
          type: "fill-extrusion",
          source: OVERTURE_BUILDINGS_SOURCE_ID,
          "source-layer": "building",
          minzoom: 13.8,
          filter: ["!=", ["get", "has_parts"], true],
          layout: {
            visibility: visible ? "visible" : "none",
          },
          paint: {
            "fill-extrusion-color": buildingColorExpr,
            "fill-extrusion-height": overtureHeightExpr,
            "fill-extrusion-base": overtureBaseExpr,
            "fill-extrusion-opacity": 0.96,
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
          minzoom: 13.8,
          layout: {
            visibility: visible ? "visible" : "none",
          },
          paint: {
            "fill-extrusion-color": buildingColorExpr,
            "fill-extrusion-height": overtureHeightExpr,
            "fill-extrusion-base": overtureBaseExpr,
            "fill-extrusion-opacity": 0.98,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer(BUILDINGS_ROOF_CAP_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_ROOF_CAP_LAYER_ID,
          type: "fill-extrusion",
          source: OVERTURE_BUILDINGS_SOURCE_ID,
          "source-layer": "building",
          minzoom: 14.1,
          filter: ["all", ["!=", ["get", "has_parts"], true], [">=", ["coalesce", ["get", "height"], 0], 11]],
          layout: { visibility: visible ? "visible" : "none" },
          paint: {
            "fill-extrusion-color": "#FAF8F5",
            "fill-extrusion-base": ["-", ["coalesce", ["get", "height"], 11], 0.6],
            "fill-extrusion-height": ["+", ["coalesce", ["get", "height"], 11], 0.15],
            "fill-extrusion-opacity": 0.98,
            "fill-extrusion-vertical-gradient": false,
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
  for (const id of ALL_3D_BUILDING_LAYERS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", vis);
    }
  }
}

/**
 * Enables or disables real elevation relief using AWS Terrarium DEM tiles +
 * subtle directional hillshade. Fails silently when offline or in Lite mode.
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
      const beforeId = map.getLayer(BUILDINGS_AO_LAYER_ID)
        ? BUILDINGS_AO_LAYER_ID
        : map.getLayer(BUILDINGS_3D_LAYER_ID)
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

    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.3 });
  } catch {
    // Silent fallback when DEM source is unavailable or WebGL context rejects terrain
  }
}

/**
 * Viewport-anchored directional sunlight so every 3D building face shows crisp
 * sunlit vs shaded contrast at any bearing, paired with Satellite/Vector sky.
 */
export function applyFlatSkyAndLight(
  map: MapLibreMap,
  is3d: boolean,
  styleMode: MapStyleMode = "satellite",
): void {
  try {
    if (styleMode === "vector") {
      map.setSky({
        "sky-color": "#CFE4FA",
        "horizon-color": "#F3F0EA",
        "fog-color": "#EFECE6",
        "sky-horizon-blend": 0.35,
        "horizon-fog-blend": 0.35,
        "atmosphere-blend": 0.4,
      });
    } else {
      map.setSky({
        "sky-color": "#0F172A",
        "horizon-color": "#1E293B",
        "fog-color": "#0F172A",
        "sky-horizon-blend": 0.2,
        "horizon-fog-blend": 0.2,
        "atmosphere-blend": 0.25,
      });
    }

    map.setLight({
      anchor: "viewport",
      intensity: is3d ? 0.62 : 0.18,
      color: "#FFF8EB",
      position: [1.4, 212, 38],
    });
  } catch {
    // Ignore on styles or contexts that do not support sky/light mutations
  }
}

/**
 * Styles the existing MapLibre basemap into either:
 * - `"satellite"` (DEFAULT): High-resolution Esri World Imagery hybrid 3D view.
 * - `"vector"`: Clean sculpted 3D architectural basemap.
 */
export function applyBasemapTheme(map: MapLibreMap, styleMode: MapStyleMode = "satellite"): void {
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

  const isSat = styleMode === "satellite";

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    const firstNonBgLayer = layers.find((layer) => layer.type !== "background")?.id;
    map.addLayer(
      {
        id: SATELLITE_LAYER_ID,
        type: "raster",
        source: SATELLITE_SOURCE_ID,
        layout: {
          visibility: isSat ? "visible" : "none",
        },
        paint: {
          "raster-opacity": 1,
          "raster-fade-duration": 150,
        },
      },
      firstNonBgLayer,
    );
  } else {
    map.setLayoutProperty(SATELLITE_LAYER_ID, "visibility", isSat ? "visible" : "none");
  }

  for (const layer of layers) {
    if (layer.id.startsWith("cargo-")) continue;

    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", isSat ? "#0F172A" : "#F3F0EA");
        continue;
      }

      if (layer.type === "fill-extrusion") {
        map.setLayoutProperty(layer.id, "visibility", "none");
        continue;
      }

      if (layer.type === "fill") {
        if (isSat) {
          map.setLayoutProperty(layer.id, "visibility", "none");
          continue;
        }

        map.setLayoutProperty(layer.id, "visibility", "visible");
        const srcLayer = String((layer as { "source-layer"?: string })["source-layer"] ?? "");
        const ident = `${layer.id} ${srcLayer}`;

        if (/water|ocean|lake|reservoir|riverbank/i.test(ident)) {
          map.setPaintProperty(layer.id, "fill-color", "#A6D4F2");
          map.setPaintProperty(layer.id, "fill-opacity", 1);
        } else if (/park|grass|wood|forest|green|meadow|cemetery|pitch|stadium|garden/i.test(ident)) {
          map.setPaintProperty(layer.id, "fill-color", "#DCEBD5");
          map.setPaintProperty(layer.id, "fill-opacity", 0.9);
        } else if (/hospital|university|college|school/i.test(ident)) {
          map.setPaintProperty(layer.id, "fill-color", "#ECE6DA");
          map.setPaintProperty(layer.id, "fill-opacity", 0.85);
        } else if (/building/i.test(ident)) {
          map.setPaintProperty(layer.id, "fill-color", "#E5DFD4");
          map.setPaintProperty(layer.id, "fill-opacity", 0.65);
        } else {
          map.setPaintProperty(layer.id, "fill-color", "#EBE7DF");
          map.setPaintProperty(layer.id, "fill-opacity", 0.6);
        }
        continue;
      }

      if (layer.type === "line") {
        if (/boundary|admin|ferry|aeroway/i.test(layer.id)) {
          map.setLayoutProperty(layer.id, "visibility", "none");
          continue;
        }
        if (/rail|footway|path|track|service|building/i.test(layer.id)) {
          map.setLayoutProperty(layer.id, "visibility", isSat ? "none" : "visible");
          if (!isSat) {
            map.setPaintProperty(layer.id, "line-color", "#DFDAD0");
            map.setPaintProperty(layer.id, "line-opacity", 0.5);
          }
          continue;
        }

        map.setLayoutProperty(layer.id, "visibility", "visible");

        if (/waterway|river|stream|canal/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", isSat ? "#38BDF8" : "#7CC0EB");
          map.setPaintProperty(layer.id, "line-opacity", isSat ? 0.5 : 0.85);
          continue;
        }

        if (/highway|motorway|trunk|primary/i.test(layer.id)) {
          if (/casing/i.test(layer.id)) {
            map.setPaintProperty(layer.id, "line-color", isSat ? "#09090B" : "#D97706");
            map.setPaintProperty(layer.id, "line-opacity", isSat ? 0.35 : 0.42);
          } else {
            map.setPaintProperty(layer.id, "line-color", isSat ? "#FDE047" : "#FDE68A");
            map.setPaintProperty(layer.id, "line-opacity", isSat ? 0.48 : 0.96);
          }
          continue;
        }

        if (/casing/i.test(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", isSat ? "#09090B" : "#CCC6BA");
          map.setPaintProperty(layer.id, "line-opacity", isSat ? 0.22 : 0.65);
        } else {
          map.setPaintProperty(layer.id, "line-color", "#FFFFFF");
          map.setPaintProperty(layer.id, "line-opacity", isSat ? 0.3 : 0.9);
        }
        continue;
      }

      if (layer.type === "symbol") {
        const layout = layer.layout as Record<string, unknown> | undefined;
        if (layout && "text-field" in layout) {
          map.setPaintProperty(layer.id, "text-color", isSat ? "#FFFFFF" : "#1F2937");
          map.setPaintProperty(layer.id, "text-halo-color", isSat ? "#09090B" : "#FFFFFF");
          map.setPaintProperty(layer.id, "text-halo-width", isSat ? 1.8 : 2.0);
          map.setPaintProperty(layer.id, "text-halo-blur", 0.45);
        }
      }
    } catch {
      // Ignore individual layers whose style spec disallows a given property
    }
  }
}

/** Backwards-compatible alias for satellite hybrid styling. */
export function applySatelliteHybridTheme(map: MapLibreMap): void {
  applyBasemapTheme(map, "satellite");
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
