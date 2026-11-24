import type { CityConfig } from "@/types/fleet";

/**
 * Worabe — Central Ethiopia regional corridor town.
 * Center: [38.1852, 7.8442].
 * Anchored directly on verified OSM coordinates linking Worabe Town Center
 * ([38.1870, 7.8530]), the yellow highway bend, and K'ali K'esa Bota ([38.1821, 7.8357]).
 */
export const WORABE_CITY: CityConfig = {
  id: "worabe",
  name: "Worabe",
  region: "Central Ethiopia",
  platePrefix: "CE",
  center: [38.1852, 7.8442],
  zoom: 14.6,
  pitch: 54,
  bearing: 0,
  bounds: [
    [38.17, 7.828],
    [38.198, 7.862],
  ],
  landmarks: [
    {
      id: "worabe-bus-station",
      name: "Bus Station",
      neighborhood: "Central Worabe",
      tag: "Taxi Stand",
      coords: [38.187, 7.8526],
      kind: "landmark",
    },
    {
      id: "worabe-university",
      name: "Worabe University",
      neighborhood: "University Quarter",
      tag: "Main Gate",
      coords: [38.1896, 7.8568],
      kind: "landmark",
    },
    {
      id: "worabe-main-market",
      name: "Main Market",
      neighborhood: "K'ali K'esa Bota",
      tag: "Taxi Stand",
      coords: [38.1821, 7.8357],
      kind: "landmark",
    },
    {
      id: "worabe-hospital",
      name: "Hospital",
      neighborhood: "Referral Quarter",
      tag: "Main Gate",
      coords: [38.1774, 7.8336],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "worabe-nb-central-roundabout",
      name: "Central Roundabout",
      neighborhood: "City Center",
      tag: "Roundabout",
      coords: [38.1852, 7.8442],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-zone-admin",
      name: "Silte Zone Admin Square",
      neighborhood: "Civic Center",
      tag: "Beside Bank",
      coords: [38.1858, 7.8492],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-alkeso-junction",
      name: "Alkeso Junction",
      neighborhood: "North Gate",
      tag: "Roundabout",
      coords: [38.1884, 7.8548],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-south-corridor",
      name: "Hossana Highway Gate",
      neighborhood: "South Worabe",
      tag: "Main Gate",
      coords: [38.1738, 7.8314],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      W01: [38.1738, 7.8314], // Hossana Highway Gate (SW)
      W02: [38.187, 7.8526],  // Bus Station (Worabe Center)
      W03: [38.1852, 7.8442], // Central Roundabout (Mid Highway Bend)
      W04: [38.1858, 7.8492], // Silte Zone Admin Square
      W05: [38.1884, 7.8548], // Alkeso Junction
      W06: [38.1896, 7.8568], // Worabe University
      W07: [38.1821, 7.8357], // Main Market (K'ali K'esa Bota)
      W08: [38.1795, 7.8384], // West Market Grid Avenue
      W09: [38.1844, 7.8512], // North Town Grid Collector
      W10: [38.1774, 7.8336], // Hospital (SW Grid)
      W11: [38.1846, 7.8342], // SE Town Grid
      W12: [38.1866, 7.8398], // East Highway Collector
      W13: [38.1798, 7.8348], // Central Spine Highway
      W14: [38.1872, 7.8562], // North Campus Loop
    },
    edges: [
      // Main North-South highway spine
      ["W01", "W13"],
      ["W13", "W02"],
      ["W02", "W03"],
      ["W03", "W04"],
      ["W04", "W05"],
      ["W05", "W06"],
      // West Market loop
      ["W01", "W08"],
      ["W08", "W02"],
      ["W08", "W07"],
      ["W07", "W02"],
      ["W07", "W03"],
      ["W07", "W09"],
      ["W09", "W04"],
      ["W09", "W05"],
      // East Hospital & University loop
      ["W01", "W10"],
      ["W13", "W10"],
      ["W10", "W03"],
      ["W10", "W11"],
      ["W11", "W03"],
      ["W11", "W04"],
      ["W11", "W12"],
      ["W12", "W04"],
      ["W12", "W06"],
      ["W05", "W14"],
      ["W14", "W06"],
    ],
  },
};
