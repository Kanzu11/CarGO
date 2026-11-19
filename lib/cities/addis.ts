import type { CityConfig } from "@/types/fleet";

/**
 * Addis Ababa — capital network.
 * Center: [38.7578, 9.0054].
 * Covers Bole Medhanialem, Meskel Square, Piassa, Megenagna, Mexico,
 * Kazanchis, Hayahulet, Arat Kilo, Sarbet, and Bole International Airport.
 */
export const ADDIS_CITY: CityConfig = {
  id: "addis",
  name: "Addis Ababa",
  region: "Addis Ababa",
  platePrefix: "AA",
  center: [38.7578, 9.0054],
  zoom: 13.5,
  pitch: 52,
  bearing: -16,
  bounds: [
    [38.72, 8.975],
    [38.815, 9.048],
  ],
  landmarks: [
    {
      id: "addis-bole-medhanialem",
      name: "Bole Medhanialem",
      neighborhood: "Bole",
      tag: "Main Gate",
      coords: [38.7892, 8.9978],
      kind: "landmark",
    },
    {
      id: "addis-meskel-square",
      name: "Meskel Square",
      neighborhood: "Kirkos",
      tag: "Roundabout",
      coords: [38.7612, 9.0104],
      kind: "landmark",
    },
    {
      id: "addis-piassa",
      name: "Piassa",
      neighborhood: "Arada",
      tag: "Taxi Stand",
      coords: [38.7498, 9.0338],
      kind: "landmark",
    },
    {
      id: "addis-megenagna",
      name: "Megenagna",
      neighborhood: "Yeka",
      tag: "Roundabout",
      coords: [38.8015, 9.0205],
      kind: "landmark",
    },
    {
      id: "addis-mexico",
      name: "Mexico Square",
      neighborhood: "Lideta",
      tag: "Roundabout",
      coords: [38.7458, 9.0102],
      kind: "landmark",
    },
    {
      id: "addis-kazanchis",
      name: "Kazanchis ECA",
      neighborhood: "Kazanchis",
      tag: "Beside Bank",
      coords: [38.7695, 9.0158],
      kind: "landmark",
    },
    {
      id: "addis-hayahulet",
      name: "22 Mazoria (Hayahulet)",
      neighborhood: "Bole",
      tag: "Taxi Stand",
      coords: [38.7852, 9.0145],
      kind: "landmark",
    },
    {
      id: "addis-airport",
      name: "Bole Airport Terminal 2",
      neighborhood: "Bole",
      tag: "Main Gate",
      coords: [38.7955, 8.9845],
      kind: "landmark",
    },
  ],
  neighborhoods: [
    {
      id: "addis-nb-arat-kilo",
      name: "Arat Kilo",
      neighborhood: "Arada",
      tag: "Roundabout",
      coords: [38.7634, 9.0332],
      kind: "neighborhood",
    },
    {
      id: "addis-nb-sarbet",
      name: "Sarbet",
      neighborhood: "Nifas Silk",
      tag: "Beside Bank",
      coords: [38.7385, 8.9965],
      kind: "neighborhood",
    },
    {
      id: "addis-nb-olympia",
      name: "Olympia",
      neighborhood: "Bole Road",
      tag: "Beside Bank",
      coords: [38.7685, 9.0028],
      kind: "neighborhood",
    },
    {
      id: "addis-nb-urael",
      name: "Urael Church Junction",
      neighborhood: "Kirkos",
      tag: "Roundabout",
      coords: [38.7762, 9.0112],
      kind: "neighborhood",
    },
    {
      id: "addis-nb-gotera",
      name: "Gotera Interchange",
      neighborhood: "Kirkos South",
      tag: "Roundabout",
      coords: [38.7585, 8.9885],
      kind: "neighborhood",
    },
  ],
  graph: {
    nodes: {
      A01: [38.7498, 9.0338], // Piassa
      A02: [38.7555, 9.0225], // Churchill Avenue Mid
      A03: [38.7612, 9.0104], // Meskel Square
      A04: [38.7458, 9.0102], // Mexico Square
      A05: [38.7385, 8.9965], // Sarbet
      A06: [38.7522, 8.9992], // Bulgaria / Kera Junction
      A07: [38.7585, 8.9885], // Gotera Interchange
      A08: [38.7685, 9.0028], // Olympia (Africa Ave)
      A09: [38.7788, 8.9998], // Dembel / Wollo Sefer
      A10: [38.7892, 8.9978], // Bole Medhanialem
      A11: [38.7955, 8.9845], // Bole Airport Terminal 2
      A12: [38.7755, 8.9895], // Wollo Sefer South
      A13: [38.7695, 9.0158], // Kazanchis
      A14: [38.7762, 9.0112], // Urael Junction
      A15: [38.7852, 9.0145], // 22 Mazoria (Hayahulet)
      A16: [38.8015, 9.0205], // Megenagna
      A17: [38.7972, 9.0078], // Imperial / Ring Road
      A18: [38.7634, 9.0332], // Arat Kilo
      A19: [38.7765, 9.0258], // Signal / Kebena
      A20: [38.7895, 9.0242], // Shola Market
      A21: [38.7418, 9.0228], // Teklehaimanot
      A22: [38.7865, 8.9892], // Bole Brass
    },
    edges: [
      // Churchill Ave & Arada loop
      ["A01", "A02"],
      ["A02", "A03"],
      ["A01", "A18"],
      ["A18", "A02"],
      ["A01", "A21"],
      ["A21", "A04"],
      ["A21", "A02"],
      // Mexico - Meskel - Kazanchis central spine
      ["A04", "A03"],
      ["A04", "A05"],
      ["A05", "A06"],
      ["A04", "A06"],
      ["A06", "A03"],
      ["A06", "A07"],
      ["A07", "A08"],
      ["A07", "A12"],
      // Africa Avenue (Bole Road)
      ["A03", "A08"],
      ["A08", "A09"],
      ["A09", "A10"],
      ["A10", "A22"],
      ["A22", "A11"],
      ["A11", "A12"],
      ["A12", "A09"],
      ["A22", "A12"],
      // Kazanchis - Urael - Hayahulet - Megenagna corridor
      ["A03", "A13"],
      ["A13", "A14"],
      ["A08", "A14"],
      ["A14", "A09"],
      ["A14", "A15"],
      ["A15", "A10"],
      ["A15", "A16"],
      ["A15", "A17"],
      ["A17", "A10"],
      ["A17", "A16"],
      // North-east Arat Kilo - Signal - Shola - Megenagna
      ["A18", "A13"],
      ["A18", "A19"],
      ["A19", "A13"],
      ["A19", "A15"],
      ["A19", "A20"],
      ["A20", "A15"],
      ["A20", "A16"],
    ],
  },
};
