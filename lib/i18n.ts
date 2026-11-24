import type {
  CityId,
  LandmarkChip,
  Locale,
  PaymentMethod,
  Place,
  Tier,
  VehicleStatus,
} from "@/types/fleet";

export interface Strings {
  brand: string;
  opsSuffix: string;
  rider: string;
  driver: string;
  opsView: string;
  mobileApp: string;
  mobileAppShort: string;
  currency: string;
  reconnectingBanner: string;
  connectedBanner: string;

  // Location source (Real GPS vs Simulated)
  gpsLabel: string;
  simLabel: string;
  liveGpsBadge: string;
  simulatedBadge: string;
  locating: string;
  enableGps: string;
  gpsDenied: string;
  gpsUnavailable: string;
  yourExactLocation: string;

  // Rider Step 1
  pickupLabel: string;
  movePin: string;
  landmarkPlaceholder: string;
  destinationLabel: string;
  chooseLandmark: string;
  pickOnMap: string;
  tapMapShort: string;
  tapMapBanner: string;
  seeRidesFrom: string;
  selectDestination: string;

  // Rider Step 2
  upfrontFare: string;
  locked: string;
  away: string;
  min: string;
  rideLabel: string;
  confirmWord: string;
  editRouteLabel: string;

  // Rider Step 3 & Receipt
  findingNearby: string;
  broadcastingTag: string;
  driverAssigned: string;
  preparingHeadOver: string;
  driverArriving: string;
  toPickup: string;
  tripInProgress: string;
  stepMatch: string;
  stepAssigned: string;
  stepPickup: string;
  stepEnRoute: string;
  cancelRide: string;
  headingTo: string;
  sos: string;
  tripCompleted: string;
  rateDriver: string;
  done: string;
  driverLabel: string;

  // Driver Mode
  online: string;
  offline: string;
  acceptingRides: string;
  goOnlineHint: string;
  todaysEarnings: string;
  completedTrips: string;
  newRequest: string;
  lockedPayout: string;
  pickupLandmark: string;
  dropoff: string;
  tripSuffix: string;
  decline: string;
  accept: string;
  enRoutePickup: string;
  atPickupLandmark: string;
  arrivedAtPickup: string;
  startTrip: string;
  completeTrip: string;
  cancel: string;
  scanningLandmarks: string;
  goOnlinePrompt: string;

  // Ops Command Center (/dispatch)
  activeFleet: string;
  tripsInProgress: string;
  avgDispatch: string;
  liveVolume: string;
  simulateTraffic: string;
  trafficShort: string;
  tabAll: string;
  tabBajaj: string;
  tabSedan: string;
  tabVan: string;
  tabCargo: string;
  searchPlaceholder: string;
  activeTrips: string;
  fleetUnits: string;
  noActiveTrips: string;
  noFleetUnits: string;
  resetFilters: string;
  speed: string;
  heading: string;
  latLng: string;
  signal: string;
  dispatchActions: string;
  reassignDriver: string;
  flagAlert: string;
  clearAlert: string;
  sendLandmarkNote: string;
  notePlaceholder: string;
  send: string;
  landmarkNoteLabel: string;
  idleUnitPrefix: string;
  idleUnitSuffix: string;
  loadingTelemetry: string;
  loadingMap: string;
  nearPrefix: string;

  // Map Style & Service-Ready Additions
  mapModeVector: string;
  mapModeSat: string;
  searchPlacePlaceholder: string;
  noPlacesFound: string;
  swapLocations: string;
  recentRides: string;
  fareDetails: string;
  baseFare: string;
  distanceCharge: string;
  timeCharge: string;
  minimumFareNote: string;
  pickupSpotLabel: string;
  callDriver: string;
  quickNoteAtGate: string;
  quickNoteBesideBank: string;
  quickNoteOnMyWay: string;
  exportCsv: string;
  statusAll: string;
  statusActive: string;
  statusIdle: string;
  statusAlert: string;
  tripIdLabel: string;
}

const EN_STRINGS: Strings = {
  brand: "CarGo",
  opsSuffix: "Ops",
  rider: "Rider",
  driver: "Driver",
  opsView: "Ops View",
  mobileApp: "Mobile App →",
  mobileAppShort: "App →",
  currency: "ETB",
  reconnectingBanner: "Reconnecting to CarGo dispatch…",
  connectedBanner: "Connected to CarGo dispatch",

  gpsLabel: "GPS",
  simLabel: "Sim",
  liveGpsBadge: "Real GPS",
  simulatedBadge: "Simulated",
  locating: "Locating…",
  enableGps: "Use GPS",
  gpsDenied: "GPS denied",
  gpsUnavailable: "GPS off",
  yourExactLocation: "Your exact location",

  pickupLabel: "Pickup",
  movePin: "Move pin",
  landmarkPlaceholder: "Landmark note (e.g. In front of blue gate)",
  destinationLabel: "Destination",
  chooseLandmark: "Choose a city landmark",
  pickOnMap: "Pick on map",
  tapMapShort: "Tap map…",
  tapMapBanner: "Tap anywhere on the map to set destination",
  seeRidesFrom: "See Rides • From",
  selectDestination: "Select Destination",

  upfrontFare: "Upfront fare",
  locked: "Locked",
  away: "away",
  min: "min",
  rideLabel: "ride",
  confirmWord: "Confirm",
  editRouteLabel: "Edit pickup and destination",

  findingNearby: "Finding nearby",
  broadcastingTag: "Broadcasting landmark tag to nearby units",
  driverAssigned: "Driver assigned",
  preparingHeadOver: "is preparing to head over",
  driverArriving: "Driver arriving",
  toPickup: "to pickup",
  tripInProgress: "Trip in progress",
  stepMatch: "Match",
  stepAssigned: "Assigned",
  stepPickup: "Pickup",
  stepEnRoute: "En route",
  cancelRide: "Cancel Ride",
  headingTo: "Heading to",
  sos: "SOS",
  tripCompleted: "Trip completed",
  rateDriver: "Rate your driver",
  done: "Done",
  driverLabel: "Driver",

  online: "Online",
  offline: "Offline",
  acceptingRides: "Accepting landmark rides",
  goOnlineHint: "Go online for requests",
  todaysEarnings: "Today's Earnings",
  completedTrips: "Completed Trips",
  newRequest: "New Request",
  lockedPayout: "Locked payout",
  pickupLandmark: "Pickup Landmark",
  dropoff: "Dropoff",
  tripSuffix: "trip",
  decline: "Decline",
  accept: "Accept",
  enRoutePickup: "En route to pickup",
  atPickupLandmark: "At pickup landmark",
  arrivedAtPickup: "Arrived at Pickup",
  startTrip: "Start Trip",
  completeTrip: "Complete Trip",
  cancel: "Cancel",
  scanningLandmarks: "Scanning landmarks — next request arriving shortly…",
  goOnlinePrompt: "Switch Online above to receive a live dispatch request in 3 seconds.",

  activeFleet: "Active Fleet",
  tripsInProgress: "Trips in Progress",
  avgDispatch: "Avg Dispatch",
  liveVolume: "Live Volume",
  simulateTraffic: "Simulate Traffic",
  trafficShort: "Traffic",
  tabAll: "All",
  tabBajaj: "Bajaj",
  tabSedan: "Sedan",
  tabVan: "Van",
  tabCargo: "Cargo",
  searchPlaceholder: "Search ID, plate, driver, landmark…",
  activeTrips: "Active Trips",
  fleetUnits: "Fleet Units",
  noActiveTrips: "No matching active trips.",
  noFleetUnits: "No matching fleet units.",
  resetFilters: "Reset filters",
  speed: "Speed",
  heading: "Heading",
  latLng: "Lat / Lng",
  signal: "Signal",
  dispatchActions: "Dispatch Actions",
  reassignDriver: "Reassign Driver",
  flagAlert: "Flag Alert",
  clearAlert: "Clear Alert",
  sendLandmarkNote: "Send Landmark Note",
  notePlaceholder: "e.g. Meet at blue gate beside CBE",
  send: "Send",
  landmarkNoteLabel: "Landmark Note",
  idleUnitPrefix: "Unit is idle near",
  idleUnitSuffix: "awaiting next landmark dispatch.",
  loadingTelemetry: "Loading telemetry…",
  loadingMap: "Loading 3D map…",
  nearPrefix: "Near",

  mapModeVector: "Map",
  mapModeSat: "Sat",
  searchPlacePlaceholder: "Search landmark or neighborhood…",
  noPlacesFound: "No matching places in this city.",
  swapLocations: "Swap pickup and destination",
  recentRides: "Recent",
  fareDetails: "Fare breakdown",
  baseFare: "Base fare",
  distanceCharge: "Distance",
  timeCharge: "Time",
  minimumFareNote: "Minimum tier fare applied",
  pickupSpotLabel: "Pickup spot & note",
  callDriver: "Call",
  quickNoteAtGate: "At main gate",
  quickNoteBesideBank: "Beside bank",
  quickNoteOnMyWay: "On my way",
  exportCsv: "CSV",
  statusAll: "All",
  statusActive: "Active",
  statusIdle: "Available",
  statusAlert: "Alerts",
  tripIdLabel: "Trip ID",
};

const AM_STRINGS: Strings = {
  brand: "ካርጎ",
  opsSuffix: "ኦፕስ",
  rider: "ተሳፋሪ",
  driver: "ሹፌር",
  opsView: "ኦፕስ ዳሽቦርድ",
  mobileApp: "ሞባይል መተግበሪያ →",
  mobileAppShort: "መተግበሪያ →",
  currency: "ብር",
  reconnectingBanner: "ከካርጎ ዲስፓች ጋር እንደገና በመገናኘት ላይ…",
  connectedBanner: "ከካርጎ ዲስፓች ጋር ተገናኝቷል",

  gpsLabel: "GPS",
  simLabel: "ማስመሰያ",
  liveGpsBadge: "ቀጥታ GPS",
  simulatedBadge: "ማስመሰያ",
  locating: "በመፈለግ ላይ…",
  enableGps: "GPS አብራ",
  gpsDenied: "GPS ተከልክሏል",
  gpsUnavailable: "GPS የለም",
  yourExactLocation: "ትክክለኛ ቦታዎ",

  pickupLabel: "መነሻ",
  movePin: "ፒን አንቀሳቅስ",
  landmarkPlaceholder: "የቦታ ማስታወሻ (ምሳሌ፡ ሰማያዊ በር ፊት ለፊት)",
  destinationLabel: "መድረሻ",
  chooseLandmark: "የከተማ መዳረሻ ይምረጡ",
  pickOnMap: "ከካርታ ምረጥ",
  tapMapShort: "ካርታ ላይ ይጫኑ…",
  tapMapBanner: "መድረሻውን ለመምረጥ ካርታው ላይ ይጫኑ",
  seeRidesFrom: "ጉዞ ምረጥ • ከ",
  selectDestination: "መድረሻ ይምረጡ",

  upfrontFare: "የተቆረጠ ዋጋ",
  locked: "የተቆረጠ",
  away: "ርቀት",
  min: "ደቂቃ",
  rideLabel: "ጉዞ",
  confirmWord: "አረጋግጥ",
  editRouteLabel: "መነሻና መድረሻ ቀይር",

  findingNearby: "በአቅራቢያ በመፈለግ ላይ",
  broadcastingTag: "የቦታ ምልክቱን በአቅራቢያ ላሉ ተሽከርካሪዎች በመላክ ላይ",
  driverAssigned: "ሹፌር ተመድቧል",
  preparingHeadOver: "ወደ እርስዎ ለመምጣት በመዘጋጀት ላይ ነው",
  driverArriving: "ሹፌሩ እየደረሰ ነው",
  toPickup: "ወደ መነሻ",
  tripInProgress: "ጉዞ በመካሄድ ላይ",
  stepMatch: "ምደባ",
  stepAssigned: "ተመድቧል",
  stepPickup: "መነሻ",
  stepEnRoute: "በጉዞ",
  cancelRide: "ጉዞ ሰርዝ",
  headingTo: "መድረሻ፡",
  sos: "አደጋ",
  tripCompleted: "ጉዞ ተጠናቋል",
  rateDriver: "ሹፌርዎን ይገምግሙ",
  done: "ተጠናቀቀ",
  driverLabel: "ሹፌር",

  online: "መስመር ላይ",
  offline: "ከመስመር ውጭ",
  acceptingRides: "የጉዞ ጥያቄዎችን በመቀበል ላይ",
  goOnlineHint: "ጥያቄ ለመቀበል መስመር ላይ ይግቡ",
  todaysEarnings: "የዛሬ ገቢ",
  completedTrips: "የተጠናቀቁ ጉዞዎች",
  newRequest: "አዲስ ጥያቄ",
  lockedPayout: "የተቆረጠ ክፍያ",
  pickupLandmark: "የመነሻ ምልክት",
  dropoff: "መድረሻ",
  tripSuffix: "ጉዞ",
  decline: "አልቀበልም",
  accept: "ተቀበል",
  enRoutePickup: "ወደ መነሻ በመጓዝ ላይ",
  atPickupLandmark: "መነሻ ቦታ ደርሷል",
  arrivedAtPickup: "መነሻ ደርሻለሁ",
  startTrip: "ጉዞ ጀምር",
  completeTrip: "ጉዞ አጠናቅቅ",
  cancel: "ሰርዝ",
  scanningLandmarks: "በአቅራቢያ ጥያቄዎችን በመፈለግ ላይ…",
  goOnlinePrompt: "በ3 ሰከንድ ውስጥ ጥያቄ ለመቀበል ከላይ መስመር ላይ ይግቡ።",

  activeFleet: "ንቁ ተሽከርካሪ",
  tripsInProgress: "በጉዞ ላይ",
  avgDispatch: "አማካይ ምደባ",
  liveVolume: "የቀጥታ ገቢ",
  simulateTraffic: "ትራፊክ አስመስል",
  trafficShort: "ትራፊክ",
  tabAll: "ሁሉም",
  tabBajaj: "ባጃጅ",
  tabSedan: "ሴዳን",
  tabVan: "ሚኒቫን",
  tabCargo: "ካርጎ",
  searchPlaceholder: "መለያ፣ ታርጋ፣ ሹፌር ወይም ቦታ ይፈልጉ…",
  activeTrips: "ንቁ ጉዞዎች",
  fleetUnits: "ተሽከርካሪዎች",
  noActiveTrips: "ተዛማጅ ንቁ ጉዞ የለም።",
  noFleetUnits: "ተዛማጅ ተሽከርካሪ የለም።",
  resetFilters: "ማጣሪያ ዳግም አስጀምር",
  speed: "ፍጥነት",
  heading: "አቅጣጫ",
  latLng: "ኮርዲኔት",
  signal: "ሲግናል",
  dispatchActions: "የዲስፓች እርምጃዎች",
  reassignDriver: "ሹፌር ቀይር",
  flagAlert: "ማስጠንቀቂያ ምልክት",
  clearAlert: "ማስጠንቀቂያ አንሳ",
  sendLandmarkNote: "የቦታ ማስታወሻ ላክ",
  notePlaceholder: "ምሳሌ፡ ንግድ ባንክ አጠገብ ሰማያዊ በር ጋር",
  send: "ላክ",
  landmarkNoteLabel: "የቦታ ማስታወሻ",
  idleUnitPrefix: "ተሽከርካሪው በ",
  idleUnitSuffix: "አቅራቢያ ትዕዛዝ በመጠበቅ ላይ ነው።",
  loadingTelemetry: "መረጃ በመጫን ላይ…",
  loadingMap: "3D ካርታ በመጫን ላይ…",
  nearPrefix: "በአቅራቢያ",

  mapModeVector: "ካርታ",
  mapModeSat: "ሳተላይት",
  searchPlacePlaceholder: "ቦታ ወይም ሰፈር ይፈልጉ…",
  noPlacesFound: "በዚህ ከተማ ተዛማጅ ቦታ አልተገኘም።",
  swapLocations: "መነሻና መድረሻ አቀያይር",
  recentRides: "የቅርብ ጉዞ",
  fareDetails: "የዋጋ ዝርዝር",
  baseFare: "መነሻ ዋጋ",
  distanceCharge: "የርቀት ክፍያ",
  timeCharge: "የጊዜ ክፍያ",
  minimumFareNote: "ዝቅተኛ የደረጃ ዋጋ ተተግብሯል",
  pickupSpotLabel: "የመነሻ ምልክትና ማስታወሻ",
  callDriver: "ደውል",
  quickNoteAtGate: "ዋና በር ጋር ነኝ",
  quickNoteBesideBank: "ባንክ አጠገብ ነኝ",
  quickNoteOnMyWay: "እየወጣሁ ነው",
  exportCsv: "CSV",
  statusAll: "ሁሉም",
  statusActive: "በጉዞ",
  statusIdle: "ዝግጁ",
  statusAlert: "አደጋ",
  tripIdLabel: "የጉዞ መለያ",
};

export function getStrings(locale: Locale): Strings {
  return locale === "am" ? AM_STRINGS : EN_STRINGS;
}

const CITY_AM: Record<CityId, string> = {
  adama: "አዳማ",
  addis: "አዲስ አበባ",
  hawassa: "ሀዋሳ",
  worabe: "ወራቤ",
};

const CITY_EN: Record<CityId, string> = {
  adama: "Adama",
  addis: "Addis Ababa",
  hawassa: "Hawassa",
  worabe: "Worabe",
};

export function localizeCityName(cityId: CityId, locale: Locale): string {
  return locale === "am" ? CITY_AM[cityId] : CITY_EN[cityId];
}

const PLACE_AM_BY_ID: Record<string, string> = {
  // Adama
  "adama-astu-gate": "አስቱ ዋና በር",
  "adama-posta-bet": "ፖስታ ቤት",
  "adama-franko": "ፍራንኮ",
  "adama-mebrat-hail": "መብራት ኃይል",
  "adama-bus-station": "አዳማ መናኸሪያ",
  "adama-bole": "ቦሌ (አዳማ)",
  "adama-hospital": "አዳማ ሜዲካል ሆስፒታል",
  "adama-pan-afric": "ፓን አፍሪክ አደባባይ",
  "adama-nb-migira": "ሚጊራ",
  "adama-nb-gende-hara": "ገንደ ሀራ",
  "adama-nb-dembela": "ደምበላ",
  "adama-nb-kebele09": "ቀበሌ 09 ፕላዛ",
  "adama-nb-expressway": "ፈጣን መንገድ ክፍያ በር",

  // Addis Ababa
  "addis-bole-medhanialem": "ቦሌ መድኃኔዓለም",
  "addis-meskel-square": "መስቀል አደባባይ",
  "addis-piassa": "ፒያሳ",
  "addis-megenagna": "መገናኛ",
  "addis-mexico": "ሜክሲኮ አደባባይ",
  "addis-kazanchis": "ካዛንቺስ ECA",
  "addis-hayahulet": "22 ማዞሪያ (ሀያሁለት)",
  "addis-airport": "ቦሌ አውሮፕላን ማረፊያ 2",
  "addis-nb-arat-kilo": "አራት ኪሎ",
  "addis-nb-sarbet": "ሳር ቤት",
  "addis-nb-olympia": "ኦሎምፒያ",
  "addis-nb-urael": "ዑራኤል ቤተክርስቲያን",
  "addis-nb-gotera": "ጎተራ መስቀለኛ",

  // Hawassa
  "hawassa-piassa": "ፒያሳ (ሀዋሳ)",
  "hawassa-university": "ሀዋሳ ዩኒቨርሲቲ",
  "hawassa-lake-view": "ሀዋሳ ሐይቅ ዳርቻ",
  "hawassa-atote": "አቶቴ",
  "hawassa-st-gabriel": "ቅዱስ ገብርኤል አደባባይ",
  "hawassa-bus-terminal": "ሀዋሳ መናኸሪያ",
  "hawassa-nb-mobil": "ሞቢል አደባባይ",
  "hawassa-nb-haile": "ኃይሌ ሪዞርት ዳርቻ",
  "hawassa-nb-arab-sefer": "አረብ ሰፈር",
  "hawassa-nb-amora-gedel": "አሞራ ገደል",

  // Worabe
  "worabe-university": "ወራቤ ዩኒቨርሲቲ",
  "worabe-bus-station": "መናኸሪያ",
  "worabe-main-market": "ዋና ገበያ",
  "worabe-hospital": "ሆስፒታል",
  "worabe-nb-central-roundabout": "ማዕከላዊ አደባባይ",
  "worabe-nb-zone-admin": "ስልጤ ዞን አስተዳደር",
  "worabe-nb-alkeso-junction": "አልከሶ መገንጠያ",
  "worabe-nb-south-corridor": "ሆሳዕና መንገድ በር",
};

const PLACE_AM_BY_NAME: Record<string, string> = {
  "ASTU Main Gate": "አስቱ ዋና በር",
  "Posta Bet": "ፖስታ ቤት",
  Franko: "ፍራንኮ",
  "Mebrat Hail": "መብራት ኃይል",
  "Adama Bus Station": "አዳማ መናኸሪያ",
  Bole: "ቦሌ (አዳማ)",
  "Adama Medical Hospital": "አዳማ ሜዲካል ሆስፒታል",
  "Pan Afric Roundabout": "ፓን አፍሪክ አደባባይ",
  Migira: "ሚጊራ",
  "Gende Hara": "ገንደ ሀራ",
  Dembela: "ደምበላ",
  "Kebele 09 Plaza": "ቀበሌ 09 ፕላዛ",
  "Expressway Toll Gate": "ፈጣን መንገድ ክፍያ በር",
  "Bole Medhanialem": "ቦሌ መድኃኔዓለም",
  "Meskel Square": "መስቀል አደባባይ",
  Piassa: "ፒያሳ",
  Megenagna: "መገናኛ",
  "Mexico Square": "ሜክሲኮ አደባባይ",
  "Kazanchis ECA": "ካዛንቺስ ECA",
  "22 Mazoria (Hayahulet)": "22 ማዞሪያ (ሀያሁለት)",
  "Bole Airport Terminal 2": "ቦሌ አውሮፕላን ማረፊያ 2",
  "Arat Kilo": "አራት ኪሎ",
  Sarbet: "ሳር ቤት",
  Olympia: "ኦሎምፒያ",
  "Urael Church Junction": "ዑራኤል ቤተክርስቲያን",
  "Gotera Interchange": "ጎተራ መስቀለኛ",
  "Hawassa University": "ሀዋሳ ዩኒቨርሲቲ",
  "Lake View Promenade": "ሀዋሳ ሐይቅ ዳርቻ",
  Atote: "አቶቴ",
  "St. Gabriel Square": "ቅዱስ ገብርኤል አደባባይ",
  "Hawassa Bus Terminal": "ሀዋሳ መናኸሪያ",
  "Mobil Roundabout": "ሞቢል አደባባይ",
  "Haile Resort Shore": "ኃይሌ ሪዞርት ዳርቻ",
  "Arab Sefer": "አረብ ሰፈር",
  "Amora Gedel Fish Market": "አሞራ ገደል",
  "Worabe University": "ወራቤ ዩኒቨርሲቲ",
  "Bus Station": "መናኸሪያ",
  "Main Market": "ዋና ገበያ",
  Hospital: "ሆስፒታል",
  "Central Roundabout": "ማዕከላዊ አደባባይ",
  "Silte Zone Admin Square": "ስልጤ ዞን አስተዳደር",
  "Alkeso Junction": "አልከሶ መገንጠያ",
  "Hossana Highway Gate": "ሆሳዕና መንገድ በር",
};

export function localizeLandmarkNameString(name: string, locale: Locale): string {
  if (locale === "en") return name;
  if (PLACE_AM_BY_NAME[name]) return PLACE_AM_BY_NAME[name]!;

  // Handle "GPS • Posta Bet" or "Near Posta Bet (140m)"
  if (name.startsWith("GPS • ")) {
    const rest = name.slice(6);
    return `GPS • ${localizeLandmarkNameString(rest, locale)}`;
  }
  const nearMatch = /^Near (.+?) \((\d+)m\)$/.exec(name);
  if (nearMatch) {
    const base = PLACE_AM_BY_NAME[nearMatch[1]!] ?? nearMatch[1]!;
    return `በ${base} አቅራቢያ (${nearMatch[2]} ሜ)`;
  }
  return name;
}

export function localizePlaceName(place: Place, locale: Locale): string {
  if (locale === "en") return place.name;
  return PLACE_AM_BY_ID[place.id] ?? localizeLandmarkNameString(place.name, locale);
}

const CHIP_AM: Record<LandmarkChip, string> = {
  "Main Gate": "ዋና በር",
  "Beside Bank": "ባንክ አጠገብ",
  Roundabout: "አደባባይ",
  "Taxi Stand": "ታክሲ ማቆሚያ",
};

export function localizeLandmarkChip(chip: LandmarkChip, locale: Locale): string {
  return locale === "am" ? CHIP_AM[chip] : chip;
}

const TIER_AM: Record<Tier, { name: string; capacityLabel: string; tagline: string }> = {
  bajaj: {
    name: "ባጃጅ",
    capacityLabel: "3 መቀመጫ",
    tagline: "ለከተማ መንገዶች ፈጣን ባለ 3 እግር",
  },
  economy: {
    name: "ኢኮኖሚ",
    capacityLabel: "4 መቀመጫ",
    tagline: "ለዕለታዊ የከተማ ጉዞ ምቹ ሴዳን",
  },
  minivan: {
    name: "ሚኒቫን",
    capacityLabel: "7 መቀመጫ",
    tagline: "ለቡድን፣ ለሻንጣ እና ለቤተሰብ ጉዞ",
  },
  cargo: {
    name: "ካርጎ",
    capacityLabel: "1,000 ኪ.ግ",
    tagline: "ቀላል የጭነት እና የእቃ ማጓጓዣ",
  },
};

const TIER_EN: Record<Tier, { name: string; capacityLabel: string; tagline: string }> = {
  bajaj: {
    name: "Bajaj",
    capacityLabel: "3 seats",
    tagline: "Nimble 3-wheeler for local streets",
  },
  economy: {
    name: "Economy",
    capacityLabel: "4 seats",
    tagline: "Everyday sedan for city rides",
  },
  minivan: {
    name: "Minivan",
    capacityLabel: "7 seats",
    tagline: "Groups, airport luggage & family trips",
  },
  cargo: {
    name: "Cargo",
    capacityLabel: "1,000 kg",
    tagline: "Light commercial pickup & box delivery",
  },
};

export function localizeTier(
  tier: Tier,
  locale: Locale,
): { name: string; capacityLabel: string; tagline: string } {
  return locale === "am" ? TIER_AM[tier] : TIER_EN[tier];
}

export function localizePayment(method: PaymentMethod, locale: Locale): string {
  if (locale === "en") {
    return method === "cash" ? "Cash" : method === "telebirr" ? "Telebirr" : "CBE Birr";
  }
  return method === "cash" ? "ጥሬ ገንዘብ" : method === "telebirr" ? "ቴሌብር" : "ሲቢኢ ብር";
}

export function localizeVehicleStatus(status: VehicleStatus, locale: Locale): string {
  if (locale === "en") {
    switch (status) {
      case "idle":
        return "Available";
      case "enroute_pickup":
        return "Arriving";
      case "on_trip":
        return "On Trip";
      case "offline":
        return "Offline";
      case "alert":
        return "Flagged Alert";
    }
  }
  switch (status) {
    case "idle":
      return "ዝግጁ";
    case "enroute_pickup":
      return "እየመጣ";
    case "on_trip":
      return "በጉዞ ላይ";
    case "offline":
      return "ከመስመር ውጭ";
    case "alert":
      return "ማስጠንቀቂያ";
  }
}

export function formatEtb(amount: number, locale: Locale): string {
  const formatted = amount.toLocaleString();
  return locale === "am" ? `${formatted} ብር` : `${formatted} ETB`;
}
