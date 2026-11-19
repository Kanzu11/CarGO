import type { CityConfig } from "@/types/fleet";

/**
 * Worabe — Central Ethiopia regional corridor town.
 * Center: [38.1986, 7.8481].
 * Covers Worabe University, Bus Station, Main Market, Worabe Comprehensive
 * Specialized Hospital, Central Roundabout, and the Addis–Hossana highway spine.
 */
export const WORABE_CITY: CityConfig = {
  id: "worabe",
  name: "Worabe",
  region: "Central Ethiopia",
  platePrefix: "CE",
  center: [38.1986, 7.8481],
  zoom: 14.5,
  pitch: 48,
  bearing: -8,
  bounds: [
    [38.175, 7.825],
    [38.222, 7.872],
  ],
  landmarks: [
    {
      id: "worabe-university",
      name: "Worabe University",
      neighborhood: "University Quarter",
      tag: "Main Gate",
      coords: [38.2068, 7.8585],
      kind: "landmark",
    },
    {
      id: "worabe-bus-station",
      name: "Bus Station",
      neighborhood: "Menaheria",
      tag: "Taxi Stand",
      coords: [38.1968, 7.8465],
      kind: "landmark",
    },
    {
      id: "worabe-main-market",
      name: "Main Market",
      neighborhood: "Gebeya",
      tag: "Taxi Stand",
      coords: [38.1938, 7.8498],
      kind: "landmark",
    },
    {
      id: "worabe-hospital",
      name: "Hospital",
      neighborhood: "Referral Quarter",
      tag: "Main Gate",
      coords: [38.2028, 7.8422],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "worabe-nb-central-roundabout",
      name: "Central Roundabout",
      neighborhood: "City Center",
      tag: "Roundabout",
      coords: [38.1986, 7.8481],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-zone-admin",
      name: "Silte Zone Admin Square",
      neighborhood: "Civic Center",
      tag: "Beside Bank",
      coords: [38.2022, 7.8518],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-alkeso-junction",
      name: "Alkeso Junction",
      neighborhood: "North Gate",
      tag: "Roundabout",
      coords: [38.2015, 7.8565],
      kind: "neighborhood",
    },
    {
      id: "worabe-nb-south-corridor",
      name: "Hossana Highway Gate",
      neighborhood: "South Worabe",
      tag: "Main Gate",
      coords: [38.1952, 7.8388],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      W01: [38.1952, 7.8388], // South Highway Gate
      W02: [38.1968, 7.8465], // Bus Station
      W03: [38.1986, 7.8481], // Central Roundabout
      W04: [38.2022, 7.8518], // Zone Admin Square
      W05: [38.2015, 7.8565], // Alkeso Junction
      W06: [38.2068, 7.8585], // Worabe University
      W07: [38.1938, 7.8498], // Main Market
      W08: [38.1918, 7.8445], // West Market Road
      W09: [38.1965, 7.8538], // North Market Collector
      W10: [38.2028, 7.8422], // Hospital
      W11: [38.2055, 7.8475], // East Hospital Loop
      W12: [38.2072, 7.8532], // East Campus Approach
      W13: [38.1988, 7.8425], // South Civic Connector
      W14: [38.2042, 7.8612], // North Campus Loop
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
