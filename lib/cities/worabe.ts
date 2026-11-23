import type { CityConfig } from "@/types/fleet";

/**
 * Worabe — Central Ethiopia regional corridor town.
 * Center: [38.1818, 7.8435].
 * Aligned directly over the Addis–Hossana yellow highway spine, northern Worabe
 * junction, and the dense K'ALI K'ESA BOTA central town grid.
 */
export const WORABE_CITY: CityConfig = {
  id: "worabe",
  name: "Worabe",
  region: "Central Ethiopia",
  platePrefix: "CE",
  center: [38.1818, 7.8435],
  zoom: 14.7,
  pitch: 52,
  bearing: -14,
  bounds: [
    [38.165, 7.825],
    [38.198, 7.865],
  ],
  landmarks: [
    {
      id: "worabe-university",
      name: "Worabe University",
      neighborhood: "University Quarter",
      tag: "Main Gate",
      coords: [38.1892, 7.8562],
      kind: "landmark",
    },
    {
      id: "worabe-bus-station",
      name: "Bus Station",
      neighborhood: "Menaheria",
      tag: "Taxi Stand",
      coords: [38.1868, 7.8518],
      kind: "landmark",
    },
    {
      id: "worabe-main-market",
      name: "Main Market",
      neighborhood: "Gebeya",
      tag: "Taxi Stand",
      coords: [38.1795, 7.8392],
      kind: "landmark",
    },
    {
      id: "worabe-hospital",
      name: "Hospital",
      neighborhood: "Referral Quarter",
      tag: "Main Gate",
      coords: [38.1748, 7.8352],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "worabe-nb-central-roundabout",
      name: "Central Roundabout",
      neighborhood: "City Center",
      tag: "Roundabout",
      coords: [38.1842, 7.8435],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-zone-admin",
      name: "Silte Zone Admin Square",
      neighborhood: "Civic Center",
      tag: "Beside Bank",
      coords: [38.1825, 7.8468],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-alkeso-junction",
      name: "Alkeso Junction",
      neighborhood: "North Gate",
      tag: "Roundabout",
      coords: [38.1882, 7.8542],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-south-corridor",
      name: "Hossana Highway Gate",
      neighborhood: "South Worabe",
      tag: "Main Gate",
      coords: [38.1718, 7.8322],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      W01: [38.1718, 7.8322], // Hossana Highway Gate (SW)
      W02: [38.1868, 7.8518], // Bus Station (North Worabe Hub)
      W03: [38.1842, 7.8435], // Central Roundabout (Highway Bend)
      W04: [38.1825, 7.8468], // Silte Zone Admin Square
      W05: [38.1882, 7.8542], // Alkeso Junction
      W06: [38.1892, 7.8562], // Worabe University
      W07: [38.1795, 7.8392], // Main Market (K'ali K'esa Bota Grid)
      W08: [38.1768, 7.8415], // West Market Grid Avenue
      W09: [38.1835, 7.8502], // North Town Collector
      W10: [38.1748, 7.8352], // Hospital (SW Grid)
      W11: [38.1818, 7.8368], // SE Town Grid
      W12: [38.1858, 7.8412], // East Highway Connector
      W13: [38.1775, 7.8372], // Central Spine Highway
      W14: [38.1862, 7.8555], // North Campus Loop
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
