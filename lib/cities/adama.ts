import type { CityConfig } from "@/types/fleet";

/**
 * Adama (Nazret) — default launch city.
 * Center: [39.2700, 8.5400].
 * Road network traces the Addis–Dire Dawa arterial corridor, ASTU ring avenue,
 * Posta Bet / Franko central boulevard, and Mebrat Hail–Bole connectors.
 */
export const ADAMA_CITY: CityConfig = {
  id: "adama",
  name: "Adama",
  region: "Oromia",
  platePrefix: "OR",
  center: [39.27, 8.54],
  zoom: 14.3,
  pitch: 50,
  bearing: -14,
  bounds: [
    [39.235, 8.515],
    [39.305, 8.575],
  ],
  landmarks: [
    {
      id: "adama-astu-gate",
      name: "ASTU Main Gate",
      neighborhood: "Bole / ASTU",
      tag: "Main Gate",
      coords: [39.2904, 8.5632],
      kind: "landmark",
    },
    {
      id: "adama-posta-bet",
      name: "Posta Bet",
      neighborhood: "Central Adama",
      tag: "Roundabout",
      coords: [39.2692, 8.5414],
      kind: "landmark",
    },
    {
      id: "adama-franko",
      name: "Franko",
      neighborhood: "Kebele 04",
      tag: "Roundabout",
      coords: [39.2745, 8.5468],
      kind: "landmark",
    },
    {
      id: "adama-mebrat-hail",
      name: "Mebrat Hail",
      neighborhood: "Mebrat Hail",
      tag: "Beside Bank",
      coords: [39.2634, 8.5364],
      kind: "landmark",
    },
    {
      id: "adama-bus-station",
      name: "Adama Bus Station",
      neighborhood: "Menaheria",
      tag: "Taxi Stand",
      coords: [39.2668, 8.5388],
      kind: "landmark",
    },
    {
      id: "adama-bole",
      name: "Bole",
      neighborhood: "Bole Sub-City",
      tag: "Taxi Stand",
      coords: [39.2825, 8.5548],
      kind: "landmark",
    },
    {
      id: "adama-hospital",
      name: "Adama Medical Hospital",
      neighborhood: "Gende Hara",
      tag: "Main Gate",
      coords: [39.2788, 8.5422],
      kind: "landmark",
    },
    {
      id: "adama-pan-afric",
      name: "Pan Afric Roundabout",
      neighborhood: "Dembela",
      tag: "Roundabout",
      coords: [39.2572, 8.5322],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "adama-nb-migira",
      name: "Migira",
      neighborhood: "Migira",
      tag: "Beside Bank",
      coords: [39.2642, 8.5462],
      kind: "neighborhood",
    },
    {
      id: "adama-nb-gende-hara",
      name: "Gende Hara",
      neighborhood: "Gende Hara",
      tag: "Taxi Stand",
      coords: [39.2768, 8.5372],
      kind: "neighborhood",
    },
    {
      id: "adama-nb-dembela",
      name: "Dembela",
      neighborhood: "Dembela",
      tag: "Roundabout",
      coords: [39.2602, 8.5415],
      kind: "neighborhood",
    },
    {
      id: "adama-nb-kebele09",
      name: "Kebele 09 Plaza",
      neighborhood: "Kebele 09",
      tag: "Beside Bank",
      coords: [39.2725, 8.5522],
      kind: "neighborhood",
    },
    {
      id: "adama-nb-expressway",
      name: "Expressway Toll Gate",
      neighborhood: "West Gate",
      tag: "Main Gate",
      coords: [39.2512, 8.5295],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      N01: [39.2512, 8.5295], // Expressway Toll Gate
      N02: [39.2572, 8.5322], // Pan Afric
      N03: [39.2634, 8.5364], // Mebrat Hail
      N04: [39.2668, 8.5388], // Adama Bus Station
      N05: [39.2692, 8.5414], // Posta Bet
      N06: [39.2718, 8.5441], // Central Avenue
      N07: [39.2745, 8.5468], // Franko
      N08: [39.2786, 8.5508], // Bole Approach
      N09: [39.2825, 8.5548], // Bole
      N10: [39.2866, 8.5592], // ASTU Avenue
      N11: [39.2904, 8.5632], // ASTU Main Gate
      N12: [39.2945, 8.5598], // ASTU East Loop
      N13: [39.2882, 8.5524], // East Bole Ring
      N14: [39.2832, 8.5465], // Stadium Junction
      N15: [39.2788, 8.5422], // Adama Medical Hospital
      N16: [39.2768, 8.5372], // Gende Hara
      N17: [39.2715, 8.5345], // South Market Road
      N18: [39.2655, 8.5318], // South Mebrat Loop
      N19: [39.2602, 8.5415], // Dembela
      N20: [39.2642, 8.5462], // Migira
      N21: [39.2684, 8.5494], // North Posta Connector
      N22: [39.2725, 8.5522], // Kebele 09 Plaza
      N23: [39.2775, 8.5565], // North Bole Collector
      N24: [39.2845, 8.5612], // ASTU West Gate
      N25: [39.2558, 8.5375], // West Dembela Connector
    },
    edges: [
      // Main SW -> NE arterial spine
      ["N01", "N02"],
      ["N02", "N03"],
      ["N03", "N04"],
      ["N04", "N05"],
      ["N05", "N06"],
      ["N06", "N07"],
      ["N07", "N08"],
      ["N08", "N09"],
      ["N09", "N10"],
      ["N10", "N11"],
      // East / South parallel corridor
      ["N11", "N12"],
      ["N12", "N10"],
      ["N12", "N13"],
      ["N13", "N09"],
      ["N13", "N14"],
      ["N14", "N08"],
      ["N14", "N07"],
      ["N14", "N15"],
      ["N15", "N06"],
      ["N15", "N16"],
      ["N16", "N05"],
      ["N16", "N17"],
      ["N17", "N04"],
      ["N17", "N18"],
      ["N18", "N03"],
      ["N18", "N02"],
      // North / West parallel corridor
      ["N01", "N25"],
      ["N25", "N02"],
      ["N25", "N19"],
      ["N19", "N03"],
      ["N19", "N05"],
      ["N19", "N20"],
      ["N20", "N05"],
      ["N20", "N06"],
      ["N20", "N21"],
      ["N21", "N06"],
      ["N21", "N07"],
      ["N21", "N22"],
      ["N22", "N07"],
      ["N22", "N08"],
      ["N22", "N23"],
      ["N23", "N08"],
      ["N23", "N09"],
      ["N23", "N24"],
      ["N24", "N10"],
      ["N24", "N11"],
    ],
  },
};
