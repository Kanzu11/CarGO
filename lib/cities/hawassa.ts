import type { CityConfig } from "@/types/fleet";

/**
 * Hawassa — lakeside regional capital.
 * Center: [38.4763, 7.0504].
 * Covers Piassa, Hawassa University Main Campus, Lake View / Amora Gedel,
 * Atote, St. Gabriel Square, Mobil Roundabout, and New Bus Terminal.
 */
export const HAWASSA_CITY: CityConfig = {
  id: "hawassa",
  name: "Hawassa",
  region: "Sidama",
  platePrefix: "SD",
  center: [38.4763, 7.0504],
  zoom: 14.8,
  pitch: 54,
  bearing: -10,
  bounds: [
    [38.448, 7.022],
    [38.508, 7.082],
  ],
  landmarks: [
    {
      id: "hawassa-piassa",
      name: "Piassa",
      neighborhood: "Central Hawassa",
      tag: "Roundabout",
      coords: [38.4762, 7.0522],
      kind: "landmark",
    },
    {
      id: "hawassa-university",
      name: "Hawassa University",
      neighborhood: "Main Campus",
      tag: "Main Gate",
      coords: [38.4945, 7.0535],
      kind: "landmark",
    },
    {
      id: "hawassa-lake-view",
      name: "Lake View Promenade",
      neighborhood: "Lake Hawassa Shore",
      tag: "Beside Bank",
      coords: [38.4638, 7.0518],
      kind: "landmark",
    },
    {
      id: "hawassa-atote",
      name: "Atote",
      neighborhood: "Atote",
      tag: "Roundabout",
      coords: [38.4872, 7.0412],
      kind: "landmark",
    },
    {
      id: "hawassa-st-gabriel",
      name: "St. Gabriel Square",
      neighborhood: "Bahil Adarash",
      tag: "Roundabout",
      coords: [38.4765, 7.0448],
      kind: "landmark",
    },
    {
      id: "hawassa-bus-terminal",
      name: "Hawassa Bus Terminal",
      neighborhood: "Menaheria",
      tag: "Taxi Stand",
      coords: [38.4835, 7.0608],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "hawassa-nb-mobil",
      name: "Mobil Roundabout",
      neighborhood: "Tabor",
      tag: "Roundabout",
      coords: [38.4768, 7.0365],
      kind: "neighborhood",
    },
    {
      id: "hawassa-nb-haile",
      name: "Haile Resort Shore",
      neighborhood: "North Shore",
      tag: "Main Gate",
      coords: [38.4712, 7.0668],
      kind: "neighborhood",
    },
    {
      id: "hawassa-nb-arab-sefer",
      name: "Arab Sefer",
      neighborhood: "Arab Sefer",
      tag: "Taxi Stand",
      coords: [38.4828, 7.0488],
      kind: "neighborhood",
    },
    {
      id: "hawassa-nb-amora-gedel",
      name: "Amora Gedel Fish Market",
      neighborhood: "Lakeside South",
      tag: "Taxi Stand",
      coords: [38.4648, 7.0415],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      H01: [38.4638, 7.0518], // Lake View Promenade
      H02: [38.47, 7.052], // Lewi Boulevard West
      H03: [38.4762, 7.0522], // Piassa
      H04: [38.4828, 7.0488], // Arab Sefer
      H05: [38.4888, 7.0528], // Stadium / University Approach
      H06: [38.4945, 7.0535], // Hawassa University
      H07: [38.4835, 7.0608], // Hawassa Bus Terminal
      H08: [38.476, 7.0602], // North Piassa Avenue
      H09: [38.4712, 7.0668], // Haile Resort Shore
      H10: [38.4655, 7.0598], // North Shore Road
      H11: [38.4765, 7.0448], // St. Gabriel Square
      H12: [38.4768, 7.0365], // Mobil Roundabout
      H13: [38.4872, 7.0412], // Atote
      H14: [38.4932, 7.0445], // East Atote Loop
      H15: [38.4648, 7.0415], // Amora Gedel
      H16: [38.4705, 7.0445], // Meskel Square West
      H17: [38.4845, 7.0352], // South Atote / Industrial Connector
      H18: [38.4918, 7.0605], // North Campus Gate
    },
    edges: [
      // Lake shore North-South boulevard
      ["H10", "H01"],
      ["H01", "H15"],
      ["H10", "H09"],
      ["H09", "H08"],
      ["H10", "H08"],
      // Main East-West Piassa - University spine
      ["H01", "H02"],
      ["H02", "H03"],
      ["H03", "H04"],
      ["H04", "H05"],
      ["H05", "H06"],
      // North grid
      ["H02", "H08"],
      ["H03", "H08"],
      ["H08", "H07"],
      ["H07", "H05"],
      ["H07", "H18"],
      ["H18", "H06"],
      ["H18", "H05"],
      // Central & South grid (St. Gabriel - Mobil - Atote)
      ["H02", "H16"],
      ["H16", "H15"],
      ["H16", "H11"],
      ["H03", "H11"],
      ["H11", "H04"],
      ["H11", "H12"],
      ["H15", "H12"],
      ["H12", "H17"],
      ["H17", "H13"],
      ["H11", "H13"],
      ["H04", "H13"],
      ["H13", "H14"],
      ["H14", "H05"],
      ["H14", "H06"],
    ],
  },
};
