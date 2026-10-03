const PROTOCOL_VERSION = "2025-11-25";

const demoPlaces = [
  {
    id: "mercadona-montblanc",
    name: "Mercadona Montblanc",
    type: "supermarket",
    distanceKm: 5.2,
    driveMinutes: 7,
    address: "Montblanc, Tarragona",
    parkingLeads: 3
  },
  {
    id: "pharmacy-montblanc",
    name: "Farmacia Montblanc Centre",
    type: "pharmacy",
    distanceKm: 5.6,
    driveMinutes: 8,
    address: "Centre, Montblanc",
    parkingLeads: 2
  },
  {
    id: "restaurant-old-town",
    name: "Restaurant near old town",
    type: "restaurant",
    distanceKm: 5.8,
    driveMinutes: 9,
    address: "Old town, Montblanc",
    parkingLeads: 1
  }
];

const demoParking = [
  {
    id: "parking-active-primary",
    label: "Free street parking lead",
    distanceMeters: 230,
    confidence: "fresh-community-signal",
    walkingMinutes: 3,
    status: "likely_free"
  },
  {
    id: "parking-active-secondary",
    label: "Second practical option",
    distanceMeters: 410,
    confidence: "recent-area-signal",
    walkingMinutes: 6,
    status: "unknown_but_likely"
  },
  {
    id: "parking-active-wide-area",
    label: "Wider fallback area",
    distanceMeters: 690,
    confidence: "low-density-area",
    walkingMinutes: 9,
    status: "fallback"
  }
];

const demoAlerts = [
  {
    id: "mobile-control-town-entrance",
    type: "mobile_control",
    label: "Mobile control near town entrance",
    severity: "medium",
    distanceKm: 3.1,
    reportedMinutesAgo: 18,
    alternateRouteDeltaMinutes: 5
  },
  {
    id: "traffic-slow-roundabout",
    type: "traffic_jam",
    label: "Slow traffic near roundabout",
    severity: "low",
    distanceKm: 1.4,
    reportedMinutesAgo: 7,
    alternateRouteDeltaMinutes: 2
  }
];

const fallbackLocation = {
  latitude: 41.3762,
  longitude: 1.1619,
  label: "Montblanc demo fallback",
  source: "demo_montblanc_fallback"
};

const supermarketSearchRadiiMeters = [750, 1500, 2500, 5000, 15000, 50000, 100000];
const supermarketCandidateLimit = 40;
const routedCandidateLimit = 6;
const geocodingTimeoutMs = 4500;
const nominatimSearchTimeoutMs = 3500;
const overpassTimeoutMs = 12000;
const overpassOverallTimeoutMs = 12000;
const routeTimeoutMs = 8000;
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const groceryShopValues = ["supermarket", "convenience", "greengrocer", "general", "department_store"];
const livePlaceCategories = [
  {
    id: "supermarket",
    singular: "supermarket",
    plural: "supermarkets",
    defaultName: "Supermarket",
    aliases: ["supermarket", "supermercado", "grocery", "groceries", "alimentacion", "alimentación"],
    filters: [{ key: "shop", values: groceryShopValues }],
    nominatimQueries: ["supermarket", "grocery"]
  },
  {
    id: "gas_station",
    singular: "gas station",
    plural: "gas stations",
    defaultName: "Gas station",
    aliases: ["gas station", "gasolinera", "gasolineras", "fuel", "petrol", "combustible"],
    filters: [{ key: "amenity", values: ["fuel"] }],
    nominatimQueries: ["gas station", "fuel"]
  },
  {
    id: "hotel",
    singular: "hotel or motel",
    plural: "hotels and motels",
    defaultName: "Hotel",
    aliases: ["hotel", "hotels", "motel", "motels", "hostal", "alojamiento"],
    filters: [{ key: "tourism", values: ["hotel", "motel", "hostel", "guest_house"] }],
    nominatimQueries: ["hotel", "motel"]
  },
  {
    id: "pharmacy",
    singular: "pharmacy",
    plural: "pharmacies",
    defaultName: "Pharmacy",
    aliases: ["pharmacy", "pharmacies", "farmacia", "farmacias"],
    filters: [{ key: "amenity", values: ["pharmacy"] }],
    nominatimQueries: ["pharmacy"]
  },
  {
    id: "food",
    singular: "place to eat",
    plural: "places to eat",
    defaultName: "Place to eat",
    aliases: ["restaurant", "restaurants", "restaurante", "restaurantes", "food", "comida"],
    filters: [{ key: "amenity", values: ["restaurant", "fast_food", "cafe"] }],
    nominatimQueries: ["restaurant"]
  }
];

function getLivePlaceCategory(query) {
  const normalized = normalizeSearchText(query);
  return livePlaceCategories.find((category) =>
    category.aliases.some((alias) => normalized.includes(normalizeSearchText(alias)))
  ) || null;
}

const toolDefinitions = [
  {
    name: "find_nearby_place",
    description:
      "Find useful nearby places from the driver's current location, even outside large cities.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Place or category requested by the driver, such as supermarket, pharmacy or restaurant."
        },
        latitude: {
          type: "number",
          description: "Driver latitude. Demo data is used when omitted."
        },
        longitude: {
          type: "number",
          description: "Driver longitude. Demo data is used when omitted."
        },
        maxResults: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          default: 3
        }
      },
      required: ["query"]
    }
  },
  {
    name: "find_parking_near_destination",
    description:
      "Find practical parking leads around a destination and explain the walking distance and confidence.",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          description: "Destination name, address or place id."
        },
        latitude: {
          type: "number",
          description: "Destination latitude. Demo data is used when omitted."
        },
        longitude: {
          type: "number",
          description: "Destination longitude. Demo data is used when omitted."
        },
        requirePreviousSpotConfirmation: {
          type: "boolean",
          default: true,
          description: "Whether ParkShare should ask if the old parking spot was left free before routing."
        }
      },
      required: ["destination"]
    }
  },
  {
    name: "get_road_alerts",
    description:
      "Return community road alerts for a route, including controls, speed cameras, accidents, roadworks and traffic jams.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Route origin or current location label."
        },
        latitude: {
          type: "number",
          description: "Current route origin latitude, required when origin is the user's live location."
        },
        longitude: {
          type: "number",
          description: "Current route origin longitude, required when origin is the user's live location."
        },
        destination: {
          type: "string",
          description: "Route destination."
        },
        includeAlternativeRoute: {
          type: "boolean",
          default: true
        }
      },
      required: ["destination"]
    }
  },
  {
    name: "release_parking_spot",
    description:
      "Mark the driver's previous parking spot as free for nearby ParkShare users.",
    inputSchema: {
      type: "object",
      properties: {
        parkingSessionId: {
          type: "string",
          description: "Optional active parking session id."
        },
        latitude: {
          type: "number",
          description: "Latitude of the released spot. Demo coordinates are used when omitted."
        },
        longitude: {
          type: "number",
          description: "Longitude of the released spot. Demo coordinates are used when omitted."
        },
        confirmation: {
          type: "string",
          enum: ["driver_confirmed_free", "driver_confirmed_occupied", "unknown"],
          default: "driver_confirmed_free"
        }
      }
    }
  },
  {
    name: "confirm_previous_spot_free",
    description:
      "Ask or record whether the driver left the previous parking spot free before starting a new route.",
    inputSchema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          enum: ["yes", "no", "ask_driver"],
          description: "Driver answer or ask_driver when Alexa should ask for confirmation."
        },
        parkingSessionId: {
          type: "string",
          description: "Optional active parking session id."
        }
      },
      required: ["answer"]
    }
  }
];

const pageScenarios = {
  supermarket: {
    label: "Find supermarket near me",
    driver: "Alexa, ask ParkShare to find the nearest supermarket from my location.",
    tool: "find_nearby_place",
    args: { query: "supermarket", maxResults: 3 },
    needsLocation: true,
    context: "Live supermarket search from the active location",
    steps: [
      "Use browser, approximate or typed driver location",
      "Search OpenStreetMap supermarkets around that point",
      "Rank results by closest mapped place",
      "Draw a route to the closest supermarket when routing is available"
    ]
  },
  fuel: {
    label: "Find gas station near me",
    driver: "Alexa, ask ParkShare to find the nearest gas station from my location.",
    tool: "find_nearby_place",
    args: { query: "gas station", maxResults: 3 },
    needsLocation: true,
    context: "Fuel stop search from the active location",
    steps: [
      "Use browser, exact or typed driver location",
      "Search OpenStreetMap fuel stops around that point",
      "Rank gas stations by closest mapped place",
      "Draw a route to the closest fuel stop when routing is available"
    ]
  },
  hotel: {
    label: "Find hotel/motel near me",
    driver: "Alexa, ask ParkShare to find the nearest hotel or motel from my location.",
    tool: "find_nearby_place",
    args: { query: "hotel", maxResults: 3 },
    needsLocation: true,
    context: "Roadside rest search from the active location",
    steps: [
      "Use browser, exact or typed driver location",
      "Search OpenStreetMap hotels and motels around that point",
      "Rank places by closest mapped location",
      "Draw a route to the closest stop when routing is available"
    ]
  },
  parking: {
    label: "Find parking near me",
    driver: "Alexa, ask ParkShare to find parking near my location.",
    tool: "find_parking_near_destination",
    args: { destination: "my current location", requirePreviousSpotConfirmation: true },
    needsLocation: true,
    context: "Parking guidance from the active location",
    steps: [
      "Use browser, approximate or typed driver location",
      "Check active parking stock",
      "Select closest practical parking lead",
      "Ask whether the previous spot was left free"
    ]
  },
  alerts: {
    label: "Road alerts",
    driver: "Alexa, ask ParkShare if there are road alerts on my route.",
    tool: "get_road_alerts",
    args: { origin: "current_location", destination: "Montblanc", includeAlternativeRoute: true },
    needsLocation: true,
    context: "Community route alerts",
    steps: [
      "Use browser, approximate or typed driver location",
      "Check active controls, cameras and traffic reports",
      "Compare primary and alternate route",
      "Prepare short driving-safe recommendation"
    ]
  },
  release: {
    label: "Release spot",
    driver: "Alexa, tell ParkShare I left my parking spot free.",
    tool: "release_parking_spot",
    args: { confirmation: "driver_confirmed_free" },
    context: "Collaborative parking update",
    steps: [
      "Confirm driver intent",
      "Release previous parking coordinates",
      "Publish temporary free-spot signal",
      "Start expiry and confidence rules"
    ]
  }
};

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ParkShare Alexa+ MCP</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    >
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #17211d;
        background: #eef2f0;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; }
      button, input { font: inherit; }
      main {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(300px, 390px) minmax(360px, 1fr);
        gap: 16px;
        padding: 16px;
      }
      section, aside {
        background: white;
        border: 1px solid #d6ddd9;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 18px 45px rgba(22, 33, 29, 0.14);
      }
      h1 { margin: 0 0 8px; font-size: clamp(26px, 4vw, 42px); line-height: 1; }
      h2 { margin: 0 0 10px; font-size: 16px; }
      p { color: #5d6963; line-height: 1.55; margin: 0; }
      code { background: #eef2f0; border-radius: 6px; padding: 3px 6px; }
      .left, .right { display: grid; gap: 16px; align-content: start; }
      .brand-mark {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: #18704c;
        color: white;
        font-weight: 850;
        margin-bottom: 14px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        margin-top: 14px;
        padding: 8px 10px;
        border-radius: 999px;
        background: #e7f3ed;
        color: #18704c;
        font-size: 13px;
        font-weight: 800;
      }
      .status::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #18704c;
      }
      .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .fallback-location {
        display: grid;
        gap: 8px;
      }
      .coordinate-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .location-controls {
        display: grid;
        gap: 8px;
        margin-top: 4px;
      }
      .secondary-button {
        background: #e7f3ed;
        color: #18704c;
        border: 1px solid #b9d7ca;
      }
      .location-status {
        min-height: 20px;
        color: #5d6963;
        font-size: 13px;
        line-height: 1.35;
      }
      .location-diagnostics {
        margin-top: 4px;
        padding: 10px 12px;
        border: 1px solid #cfe5da;
        border-radius: 8px;
        background: #eef8f3;
        color: #183d2c;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-line;
      }
      .location-gate {
        display: grid;
        gap: 8px;
        padding: 12px;
        border: 1px solid #b9d7ca;
        border-radius: 8px;
        background: #f2faf6;
      }
      .location-gate strong {
        color: #17211d;
        font-size: 15px;
      }
      .location-gate p {
        font-size: 13px;
      }
      .fallback-location label {
        color: #5d6963;
        font-size: 13px;
        font-weight: 800;
      }
      .fallback-location input {
        min-height: 42px;
        min-width: 0;
        border: 1px solid #d6ddd9;
        border-radius: 8px;
        padding: 0 12px;
        color: #17211d;
      }
      .fallback-location small {
        color: #5d6963;
        line-height: 1.35;
      }
      button {
        min-height: 44px;
        border: 0;
        border-radius: 8px;
        background: #17211d;
        color: white;
        cursor: pointer;
        font-weight: 800;
      }
      button:hover { filter: brightness(1.08); }
      button:disabled { cursor: wait; opacity: 0.7; }
      .conversation {
        min-height: 180px;
        max-height: 340px;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .message {
        max-width: 92%;
        padding: 11px 12px;
        border-radius: 8px;
        line-height: 1.35;
        font-size: 14px;
      }
      .driver { align-self: flex-end; background: #e7edf3; }
      .assistant { align-self: flex-start; background: #e7f3ed; }
      .answer {
        border: 1px solid #b9d7ca;
        background: #f2faf6;
      }
      .map {
        min-height: 390px;
        overflow: hidden;
        padding: 0;
        background: #dce7e2;
      }
      #map {
        width: 100%;
        min-height: 390px;
        height: 100%;
      }
      .map-placeholder {
        display: grid;
        min-height: 390px;
        place-items: center;
        padding: 18px;
        text-align: center;
        color: #5d6963;
      }
      .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .meta-grid div, .result, .step {
        border: 1px solid #d6ddd9;
        border-radius: 8px;
        padding: 10px;
      }
      .meta-grid strong { display: block; font-size: 22px; }
      .meta-grid span, .result span, .step { color: #5d6963; }
      .results, .steps { display: grid; gap: 8px; }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 220px;
        overflow: auto;
        margin: 0;
        padding: 12px;
        border-radius: 8px;
        background: #101815;
        color: #d8f3e7;
        font-size: 12px;
      }
      @media (max-width: 920px) {
        main { grid-template-columns: 1fr; padding: 8px; gap: 8px; }
      }
      @media (max-width: 560px) {
        .actions, .meta-grid, .coordinate-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="left">
        <section>
          <div class="brand-mark">P</div>
          <h1>ParkShare Alexa+ MCP</h1>
          <p>
            Interactive demo for the ParkShare Alexa+ mobility copilot. Nearby-place search uses the
            visitor's browser location when they allow it, searches live OpenStreetMap data, and draws
            the route on a real map. MCP clients use <code>POST /mcp</code>; this browser demo calls
            <code>POST /demo</code>, backed by the same ParkShare tool functions.
          </p>
          <div class="status">MCP endpoint live · GPS diagnostics</div>
        </section>

        <section>
          <h2>Demo scenarios</h2>
          <div class="actions" id="actions"></div>
        </section>

        <section class="fallback-location">
          <h2>Start location</h2>
          <div class="location-gate" id="locationGate">
            <strong>Permitir ubicación para esta demo</strong>
            <p>ParkShare necesita tu GPS real para buscar sitios cercanos con precisión. Pulsa el botón y acepta el aviso nativo del navegador. Si este navegador no muestra el aviso, abre la URL en Chrome/Safari o usa coordenadas exactas.</p>
            <button class="secondary-button" id="startLocationPermission" type="button">Permitir ubicación</button>
          </div>
          <label for="manualLatitude">Exact coordinates</label>
          <div class="coordinate-grid">
            <input id="manualLatitude" type="text" inputmode="decimal" placeholder="Latitude">
            <input id="manualLongitude" type="text" inputmode="decimal" placeholder="Longitude">
          </div>
          <label for="manualLocation">Exact address or city</label>
          <input id="manualLocation" type="text" placeholder="Street and number, city, country" autocomplete="street-address">
          <div class="location-controls">
            <button class="secondary-button" id="useBrowserLocation" type="button">Usar ubicación GPS</button>
            <div class="location-status" id="locationStatus">Press a "near me" scenario or this button to request browser GPS. If this embedded browser blocks the permission popup, enter an exact address or coordinates.</div>
          </div>
          <div class="location-diagnostics" id="locationDiagnostics">Diagnóstico GPS: comprobando navegador...</div>
          <small>Leave these empty to request browser GPS for this search. IP/network location is not used for nearest-place results because it can be kilometers away. If GPS is denied, enter exact coordinates or an address with enough city and country context.</small>
        </section>

        <section>
          <h2>Conversation</h2>
          <div class="conversation" id="conversation" aria-live="polite"></div>
        </section>
      </div>

      <div class="right">
        <section class="answer">
          <h2>Assistant answer</h2>
          <p id="assistantAnswer">Choose a scenario to call the ParkShare MCP server.</p>
        </section>

        <section class="map" aria-label="Route preview">
          <div id="map">
            <div class="map-placeholder">Choose a nearby-place scenario and allow location to draw a live route.</div>
          </div>
        </section>

        <section>
          <h2 id="contextTitle">Current mobility context</h2>
          <div class="meta-grid">
            <div><strong id="toolCount">${toolDefinitions.length}</strong><span>ParkShare tools</span></div>
            <div><strong id="endpointLabel">/mcp</strong><span>HTTPS endpoint</span></div>
            <div><strong id="statusLabel">Ready</strong><span>Alexa+ connection</span></div>
          </div>
        </section>

        <section>
          <h2>Action log</h2>
          <div class="steps" id="steps"></div>
        </section>

        <section>
          <h2>Structured result</h2>
          <div class="results" id="results"></div>
        </section>

        <section>
          <h2>MCP response</h2>
          <pre id="rawResponse">{}</pre>
        </section>
      </div>
    </main>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const scenarios = ${JSON.stringify(pageScenarios)};
      const actions = document.querySelector("#actions");
      const conversation = document.querySelector("#conversation");
      const assistantAnswer = document.querySelector("#assistantAnswer");
      const contextTitle = document.querySelector("#contextTitle");
      const manualLocation = document.querySelector("#manualLocation");
      const manualLatitude = document.querySelector("#manualLatitude");
      const manualLongitude = document.querySelector("#manualLongitude");
      const useBrowserLocation = document.querySelector("#useBrowserLocation");
      const startLocationPermission = document.querySelector("#startLocationPermission");
      const locationGate = document.querySelector("#locationGate");
      const locationStatus = document.querySelector("#locationStatus");
      const locationDiagnostics = document.querySelector("#locationDiagnostics");
      const steps = document.querySelector("#steps");
      const results = document.querySelector("#results");
      const rawResponse = document.querySelector("#rawResponse");
      let map;
      let routeLayer;
      let driverMarker;
      let placeMarker;
      let cachedBrowserLocation = loadCachedBrowserLocation();
      let initialLocationRequestStarted = false;
      let lastPermissionState = "checking";
      let lastLocationError = null;

      function addMessage(className, text) {
        const node = document.createElement("div");
        node.className = "message " + className;
        node.textContent = text;
        conversation.appendChild(node);
        conversation.scrollTop = conversation.scrollHeight;
      }

      function renderSteps(items) {
        steps.replaceChildren();
        items.forEach((text) => {
          const node = document.createElement("div");
          node.className = "step";
          node.textContent = text;
          steps.appendChild(node);
        });
      }

      function renderStructured(data) {
        results.replaceChildren();
        const entries = Object.entries(data || {});
        if (!entries.length) {
          const node = document.createElement("div");
          node.className = "result";
          node.textContent = "No structured result yet.";
          results.appendChild(node);
          return;
        }

        entries.slice(0, 6).forEach(([key, value]) => {
          const node = document.createElement("div");
          node.className = "result";
          const strong = document.createElement("strong");
          strong.textContent = key;
          const span = document.createElement("span");
          span.textContent = Array.isArray(value)
            ? value.map((item) => item.name || item.label || item.id || JSON.stringify(item)).join(" | ")
            : typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value);
          node.append(strong, span);
          results.appendChild(node);
        });
      }

      function getBrowserLocation() {
        return new Promise((resolve, reject) => {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            const error = new Error("This browser does not expose GPS location.");
            error.code = "GEOLOCATION_UNSUPPORTED";
            reject(error);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy
            }),
            (error) => {
              const wrapped = new Error(error && error.message
                ? error.message
                : "Browser GPS was not available.");
              wrapped.code = error && error.code;
              reject(wrapped);
            },
            { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 }
          );
        });
      }

      function loadCachedBrowserLocation() {
        try {
          const raw = window.sessionStorage && window.sessionStorage.getItem("parkshareDemoBrowserLocation");
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") {
            return null;
          }
          return parsed;
        } catch (error) {
          return null;
        }
      }

      function saveCachedBrowserLocation(location) {
        cachedBrowserLocation = {
          ...location,
          savedAt: Date.now()
        };
        try {
          if (window.sessionStorage) {
            window.sessionStorage.setItem("parkshareDemoBrowserLocation", JSON.stringify(cachedBrowserLocation));
          }
        } catch (error) {
          // Session storage can be disabled in embedded browsers.
        }
      }

      async function getGeolocationPermissionState() {
        if (typeof window !== "undefined" && window.isSecureContext === false) {
          lastPermissionState = "blocked_not_secure";
          renderLocationDiagnostics();
          return "blocked_not_secure";
        }

        if (typeof navigator === "undefined" || !navigator.geolocation) {
          lastPermissionState = "unavailable";
          renderLocationDiagnostics();
          return "unavailable";
        }

        if (!navigator.permissions || !navigator.permissions.query) {
          lastPermissionState = "unknown";
          renderLocationDiagnostics();
          return "unknown";
        }

        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          status.onchange = () => {
            updateLocationStatusForPermissionState(status.state);
          };
          lastPermissionState = status.state || "unknown";
          renderLocationDiagnostics();
          return status.state || "unknown";
        } catch (error) {
          lastPermissionState = "unknown";
          renderLocationDiagnostics();
          return "unknown";
        }
      }

      function updateLocationStatusForPermissionState(state) {
        lastPermissionState = state || "unknown";
        renderLocationDiagnostics();
        if (cachedBrowserLocation) {
          setLocationStatus(
            "GPS guardado para esta sesión. Precisión aproximada: " +
            Math.round(cachedBrowserLocation.accuracyMeters || 0) +
            " metros."
          );
          return;
        }

        if (state === "granted") {
          setLocationStatus("El navegador ya tiene permiso de ubicación. Pulsa un escenario o Usar ubicación GPS para tomar el punto actual.");
          return;
        }

        if (state === "prompt") {
          setLocationStatus("Pulsa Permitir ubicación o un escenario cercano. El navegador debería mostrar el aviso nativo de ubicación.");
          return;
        }

        if (state === "denied") {
          setLocationStatus("El permiso de ubicación está bloqueado para esta página. Actívalo en los permisos del sitio o escribe coordenadas/dirección exacta.");
          return;
        }

        if (state === "blocked_not_secure") {
          setLocationStatus("El navegador no permite GPS porque la página no está en un contexto seguro.");
          return;
        }

        if (state === "unavailable") {
          setLocationStatus("Este navegador no expone GPS. Abre la demo en Chrome/Safari o escribe coordenadas/dirección exacta.");
          return;
        }

        setLocationStatus("Pulsa Permitir ubicación. Si no aparece ningún aviso nativo, este navegador está bloqueando GPS: abre la demo en Chrome/Safari o escribe coordenadas/dirección exacta.");
      }

      async function refreshLocationPermissionState() {
        const state = await getGeolocationPermissionState();
        updateLocationStatusForPermissionState(state);
        return state;
      }

      function setLocationStatus(text) {
        locationStatus.textContent = text;
      }

      function renderLocationDiagnostics() {
        const secureContext = typeof window !== "undefined" && window.isSecureContext !== false;
        const hasGeoApi = typeof navigator !== "undefined" && Boolean(navigator.geolocation);
        const hasPermissionsApi = typeof navigator !== "undefined" &&
          Boolean(navigator.permissions && navigator.permissions.query);
        const cachedText = cachedBrowserLocation
          ? "sí, precisión " + Math.round(cachedBrowserLocation.accuracyMeters || 0) + " m"
          : "no";
        const errorText = lastLocationError
          ? getReadableGeolocationError(lastLocationError)
          : "sin error todavía";

        locationDiagnostics.textContent = [
          "Diagnóstico GPS:",
          "Versión visible: gps-auto-request+diagnostics",
          "HTTPS/contexto seguro: " + (secureContext ? "sí" : "no"),
          "API GPS del navegador: " + (hasGeoApi ? "sí" : "no"),
          "API de permisos: " + (hasPermissionsApi ? "sí" : "no"),
          "Permiso informado: " + lastPermissionState,
          "GPS guardado en sesión: " + cachedText,
          "Último error: " + errorText
        ].join("\\n");
      }

      function getReadableGeolocationError(error) {
        if (!error) return "sin error";
        if (error.code === 1) return "1 PERMISSION_DENIED";
        if (error.code === 2) return "2 POSITION_UNAVAILABLE";
        if (error.code === 3) return "3 TIMEOUT";
        if (error.code === "GEOLOCATION_UNSUPPORTED") return "GEOLOCATION_UNSUPPORTED";
        return String(error.code || error.name || error.message || "desconocido");
      }

      function getLocationPermissionPromptMessage() {
        return "ParkShare está solicitando tu ubicación al navegador. Si aparece el aviso nativo, pulsa Permitir. Si no aparece, este navegador está bloqueando el permiso y debes abrir la demo en Chrome/Safari o usar dirección/coordenadas.";
      }

      async function requestBrowserLocationForSearch() {
        try {
          setLocationStatus(getLocationPermissionPromptMessage());
          const location = await getBrowserLocation();
          lastLocationError = null;
          saveCachedBrowserLocation(location);
          renderLocationDiagnostics();
          setLocationStatus(
            "GPS ready for this session. Accuracy: about " +
            Math.round(location.accuracyMeters || 0) +
            " meters."
          );
          return { location, fromCache: false };
        } catch (error) {
          if (cachedBrowserLocation) {
            setLocationStatus("Using the GPS position already allowed in this session.");
            return { location: cachedBrowserLocation, fromCache: true };
          }
          lastLocationError = error;
          renderLocationDiagnostics();
          setLocationStatus(getLocationFailureMessage(error));
          throw error;
        }
      }

      async function requestEntryLocationPermission() {
        startLocationPermission.disabled = true;
        try {
          await refreshLocationPermissionState();
          await requestBrowserLocationForSearch();
          locationGate.style.display = "none";
          manualLatitude.value = "";
          manualLongitude.value = "";
          manualLocation.value = "";
        } catch (error) {
          setLocationStatus(getLocationFailureMessage(error));
          await refreshLocationPermissionState();
        } finally {
          startLocationPermission.disabled = false;
        }
      }

      async function requestInitialBrowserLocation() {
        const state = await refreshLocationPermissionState();
        if (!["granted", "prompt", "unknown"].includes(state) || initialLocationRequestStarted) {
          return;
        }

        initialLocationRequestStarted = true;
        try {
          await requestBrowserLocationForSearch();
          locationGate.style.display = "none";
          manualLatitude.value = "";
          manualLongitude.value = "";
          manualLocation.value = "";
        } catch (error) {
          const latestState = await getGeolocationPermissionState();
          setLocationStatus(getLocationFailureMessage(error, latestState));
        }
      }

      function addClientTimeContext(args) {
        const now = new Date();
        args.clientWeekday = now.getDay();
        args.clientMinutes = now.getHours() * 60 + now.getMinutes();
        args.clientTimezoneOffsetMinutes = now.getTimezoneOffset();
      }

      function getLocationFailureMessage(error, permissionState = null) {
        if (permissionState === "denied") {
          return "El permiso de ubicación está bloqueado para esta página. Actívalo en los permisos del sitio o escribe dirección exacta/coordenadas.";
        }

        if (error && error.code === "GEOLOCATION_UNSUPPORTED") {
          return "Este navegador no puede abrir el aviso de permiso de ubicación. Abre la demo en Chrome/Safari o escribe dirección exacta/coordenadas.";
        }

        if (error && error.code === 1) {
          return "El permiso de ubicación fue denegado. Pulsa Permitir cuando el navegador lo pida o escribe dirección exacta/coordenadas.";
        }

        if (error && error.code === 2) {
          return "La página ha pedido la ubicación, pero este navegador no pudo entregar GPS ni mostró un permiso utilizable. Abre la demo en Chrome/Safari o escribe dirección exacta/coordenadas.";
        }

        if (error && error.code === 3) {
          return "La petición GPS agotó el tiempo. Si aparece el aviso, pulsa Permitir. Si no aparece, abre la demo en Chrome/Safari o escribe dirección exacta/coordenadas.";
        }

        return "El GPS del navegador no está disponible. Pulsa Permitir si el navegador lo pide, o escribe dirección exacta/coordenadas. No uso IP/red porque puede fallar por kilómetros.";
      }

      function showMissingLocationResult(scenario, driverText, message, driverAlreadyAdded = false) {
        const structuredContent = {
          query: scenario.args && scenario.args.query ? scenario.args.query : scenario.tool,
          locationSource: "missing_location",
          needsLocation: true,
          results: []
        };
        const data = {
          content: [{ type: "text", text: message }],
          structuredContent
        };

        assistantAnswer.textContent = message;
        if (!driverAlreadyAdded) {
          addMessage("driver", driverText);
        }
        addMessage("assistant", message);
        renderStructured(structuredContent);
        rawResponse.textContent = JSON.stringify(data, null, 2);
      }

      async function fetchDemoResult(tool, args) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 32000);

        try {
          const response = await fetch("/demo", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tool, arguments: args }),
            signal: controller.signal
          });

          if (!response.ok) {
            const message = await response.text().catch(() => "");
            throw new Error(message || "ParkShare demo request failed.");
          }

          return response.json();
        } finally {
          window.clearTimeout(timeout);
        }
      }

      function ensureMap(latitude, longitude) {
        if (!window.L) return false;

        if (!map) {
          document.querySelector("#map").replaceChildren();
          map = L.map("map", {
            zoomControl: true,
            attributionControl: true
          }).setView([latitude, longitude], 13);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
          }).addTo(map);
        }

        return true;
      }

      function formatMinutes(minutes) {
        return Number(minutes) === 1 ? "1 minute" : minutes + " minutes";
      }

      function parseTypedCoordinates() {
        const latitudeText = manualLatitude.value.trim().replace(",", ".");
        const longitudeText = manualLongitude.value.trim().replace(",", ".");
        const hasLatitude = latitudeText.length > 0;
        const hasLongitude = longitudeText.length > 0;

        if (!hasLatitude && !hasLongitude) return null;

        const latitude = Number(latitudeText);
        const longitude = Number(longitudeText);
        if (
          !hasLatitude ||
          !hasLongitude ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw new Error("Enter both latitude and longitude with valid numeric values.");
        }

        return { latitude, longitude };
      }

      function getLocationDriverText(scenario, source) {
        if (scenario.tool === "find_parking_near_destination") {
          if (source === "coordinates") {
            return "Alexa, ask ParkShare to find parking near these exact coordinates.";
          }
          if (source === "typed") {
            return "Alexa, ask ParkShare to find parking near this typed city or address.";
          }
          return "Alexa, ask ParkShare to find parking near my location.";
        }

        if (scenario.tool === "get_road_alerts") {
          if (source === "coordinates") {
            return "Alexa, ask ParkShare if there are road alerts from these exact coordinates.";
          }
          if (source === "typed") {
            return "Alexa, ask ParkShare if there are road alerts from this typed city or address.";
          }
          return "Alexa, ask ParkShare if there are road alerts from my location.";
        }

        const target = getScenarioTarget(scenario, "singular");
        if (source === "coordinates") {
          return "Alexa, ask ParkShare to find " + target + " from these exact coordinates.";
        }
        if (source === "typed") {
          return "Alexa, ask ParkShare to find " + target + " from this typed city or address.";
        }
        return "Alexa, ask ParkShare to find " + target + " from my location.";
      }

      function getScenarioTarget(scenario, form) {
        const query = String((scenario.args && scenario.args.query) || "").toLowerCase();
        if (scenario.tool === "find_parking_near_destination") return "parking";
        if (scenario.tool === "get_road_alerts") return "road alerts";
        if (query.includes("gas station") || query.includes("fuel")) {
          return form === "singular" ? "the nearest gas station" : "gas stations";
        }
        if (query.includes("hotel") || query.includes("motel")) {
          return form === "singular" ? "the nearest hotel or motel" : "hotels and motels";
        }
        return form === "singular" ? "the nearest supermarket" : "supermarkets";
      }

      function getLocationProgressMessage(scenario, source) {
        const target = getScenarioTarget(scenario, "plural");

        if (source === "coordinates") {
          return "Searching " + target + " from the exact coordinates you entered...";
        }
        if (source === "typed") {
          return "Searching " + target + " from the typed address...";
        }
        return "Searching " + target + " near this location...";
      }

      function getLocationAcknowledgement(scenario, source) {
        const target = getScenarioTarget(scenario, "singular");

        if (source === "coordinates") {
          return "I will search " + target + " from the exact coordinates you entered.";
        }
        if (source === "typed") {
          return "I will search " + target + " from the address or city you typed.";
        }
        return "Location allowed. Searching " + target + " now.";
      }

      function describeLocationForSpeech(source, label) {
        if (source === "browser_geolocation") return "your precise browser location";
        if (source === "cached_browser_geolocation") return "your saved browser location from this session";
        if (source === "typed_coordinates") return "the exact coordinates you entered";
        if (source === "manual_geocoded_location" || source === "manual_location_text") {
          return "the typed address " + label;
        }
        if (source === "network_approximate_location" || source === "ip_approximate_location") {
          return "your approximate network location";
        }
        return label || "the selected location";
      }

      function describeStructuredCategory(structured) {
        if (!structured || !structured.category) return "";
        if (structured.category === "gas_station") return "the nearest gas station, ";
        if (structured.category === "hotel") return "the nearest hotel or motel, ";
        if (structured.category === "pharmacy") return "the nearest pharmacy, ";
        if (structured.category === "food") return "the nearest place to eat, ";
        if (structured.category === "supermarket") return "the nearest supermarket, ";
        return "";
      }

      function describeAvailabilityForSpeech(destination) {
        if (!destination) return "";
        if (destination.availability === "open") return " It appears open now.";
        if (destination.availability === "closed") return " It may be closed now, so check before going.";
        return "";
      }

      function textHasLocalityContext(text) {
        const lower = text.toLowerCase();
        return [
          "zaragoza",
          "madrid",
          "barcelona",
          "valencia",
          "malaga",
          "málaga",
          "sevilla",
          "santander",
          "montblanc",
          "españa",
          "spain",
          "colombia"
        ].some((token) => lower.includes(token));
      }

      async function fetchBrowserRoute(origin, destination) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 9000);
        const url =
          "https://router.project-osrm.org/route/v1/driving/" +
          origin.longitude + "," + origin.latitude + ";" +
          destination.longitude + "," + destination.latitude +
          "?overview=full&geometries=geojson";

        try {
          const response = await fetch(url, {
            headers: { "accept": "application/json" },
            signal: controller.signal
          });
          if (!response.ok) return null;
          const data = await response.json();
          const route = data.routes && data.routes[0];
          if (!route) return null;

          return {
            source: "osrm_browser",
            distanceKm: Number((route.distance / 1000).toFixed(1)),
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            coordinates: route.geometry && Array.isArray(route.geometry.coordinates)
              ? route.geometry.coordinates
              : []
          };
        } catch (error) {
          return null;
        } finally {
          window.clearTimeout(timeout);
        }
      }

      async function addBrowserRouteIfNeeded(data) {
        const structured = data.structuredContent || data;
        const origin = structured && structured.originCoordinates;
        const destination = structured && structured.results && structured.results[0];

        if (
          structured.route ||
          !origin ||
          !destination ||
          !destination.latitude ||
          !destination.longitude
        ) {
          return;
        }

        const route = await fetchBrowserRoute(origin, destination);
        if (!route) return;

        structured.route = route;
        destination.driveDistanceKm = route.distanceKm;
        destination.driveMinutes = route.durationMinutes;

        if (data.content && data.content[0]) {
          const label = describeLocationForSpeech(
            structured.locationSource,
            structured.locationLabel || "your location"
          );
          data.content[0].text =
            "Using " + label + ", I found " + destination.name + ", " +
            describeStructuredCategory(structured) + "about " +
            destination.distanceKm + " kilometers away. The drive is around " +
            formatMinutes(route.durationMinutes) + "." + describeAvailabilityForSpeech(destination);
        }
      }

      function renderMap(data) {
        const origin = data && data.originCoordinates;
        const destination = data && data.results && data.results[0];
        if (!origin || !destination || !destination.latitude || !destination.longitude) return;
        if (!ensureMap(origin.latitude, origin.longitude)) return;

        if (routeLayer) routeLayer.remove();
        if (driverMarker) driverMarker.remove();
        if (placeMarker) placeMarker.remove();

        driverMarker = L.marker([origin.latitude, origin.longitude]).addTo(map).bindPopup("Your location");
        placeMarker = L.marker([destination.latitude, destination.longitude])
          .addTo(map)
          .bindPopup(destination.name || "Supermarket");

        if (!data.route || !Array.isArray(data.route.coordinates) || !data.route.coordinates.length) {
          const bounds = L.latLngBounds([
            [origin.latitude, origin.longitude],
            [destination.latitude, destination.longitude]
          ]);
          map.fitBounds(bounds.pad(0.24));
          return;
        }

        const routeCoordinates = data.route.coordinates
          .map(([longitude, latitude]) => [latitude, longitude]);

        routeLayer = L.polyline(routeCoordinates, {
          color: "#215f88",
          weight: 5,
          opacity: 0.9
        }).addTo(map);

        map.fitBounds(routeLayer.getBounds().pad(0.24));
      }

      async function callScenario(key) {
        const scenario = scenarios[key];
        document.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        assistantAnswer.textContent = scenario.needsLocation
          ? "Requesting browser location..."
          : "Calling ParkShare MCP demo...";
        contextTitle.textContent = scenario.context;
        renderSteps(scenario.steps);

        try {
          const args = { ...scenario.args };
          addClientTimeContext(args);
          let driverText = scenario.driver;
          if (scenario.needsLocation) {
            const manualText = manualLocation.value.trim();
            const typedCoordinates = parseTypedCoordinates();
            if (typedCoordinates) {
              args.latitude = typedCoordinates.latitude;
              args.longitude = typedCoordinates.longitude;
              args.locationSource = "typed_coordinates";
              args.locationLabel =
                typedCoordinates.latitude.toFixed(6) + ", " + typedCoordinates.longitude.toFixed(6);
              driverText = getLocationDriverText(scenario, "coordinates");
              assistantAnswer.textContent = getLocationProgressMessage(scenario, "coordinates");
              addMessage("driver", driverText);
              addMessage("assistant", getLocationAcknowledgement(scenario, "coordinates"));
            } else if (manualText) {
              args.locationText = manualText;
              args.locationSource = "manual_location_text";
              args.locationLabel = manualText;
              if (cachedBrowserLocation && !textHasLocalityContext(manualText)) {
                args.geocodeBiasLatitude = cachedBrowserLocation.latitude;
                args.geocodeBiasLongitude = cachedBrowserLocation.longitude;
                args.geocodeBiasRadiusMeters = 50000;
              }
              driverText = getLocationDriverText(scenario, "typed");
              assistantAnswer.textContent = getLocationProgressMessage(scenario, "typed");
              addMessage("driver", driverText);
              addMessage("assistant", getLocationAcknowledgement(scenario, "typed"));
            } else {
              driverText = getLocationDriverText(scenario, "browser");
              assistantAnswer.textContent = getLocationPermissionPromptMessage();
              addMessage("driver", driverText);
              addMessage("assistant", getLocationPermissionPromptMessage());
              try {
                const locationResult = await requestBrowserLocationForSearch();
                const location = locationResult.location;
                args.latitude = location.latitude;
                args.longitude = location.longitude;
                args.accuracyMeters = location.accuracyMeters;
                args.locationSource = locationResult.fromCache
                  ? "cached_browser_geolocation"
                  : "browser_geolocation";
                args.locationLabel = locationResult.fromCache
                  ? "your saved browser location from this session"
                  : "your precise browser location";
                assistantAnswer.textContent = getLocationProgressMessage(scenario, "browser");
                addMessage("assistant", getLocationAcknowledgement(scenario, "browser"));
              } catch (locationError) {
                args.locationSource = "missing_location";
                args.gpsFallbackReason = getLocationFailureMessage(locationError);
                showMissingLocationResult(
                  scenario,
                  driverText,
                  getLocationFailureMessage(locationError),
                  true
                );
                return;
              }
            }
          } else {
            addMessage("driver", driverText);
          }

          const data = await fetchDemoResult(scenario.tool, args);
          await addBrowserRouteIfNeeded(data);
          const answer = data.content && data.content[0]
            ? data.content[0].text
            : "The MCP server answered, but no speech text was returned.";

          assistantAnswer.textContent = answer;
          addMessage("assistant", answer);
          renderStructured(data.structuredContent || data);
          renderMap(data.structuredContent || data);
          rawResponse.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          assistantAnswer.textContent =
            error && error.name === "AbortError"
              ? "The live lookup took too long. Please try again or type a more specific city or address."
              : "The browser could not complete this ParkShare demo request.";
          addMessage("assistant", assistantAnswer.textContent);
          rawResponse.textContent = String(error && error.message ? error.message : error);
        } finally {
          document.querySelectorAll("button").forEach((button) => { button.disabled = false; });
        }
      }

      Object.entries(scenarios).forEach(([key, scenario]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = scenario.label;
        button.addEventListener("click", () => callScenario(key));
        actions.appendChild(button);
      });

      useBrowserLocation.addEventListener("click", async () => {
        useBrowserLocation.disabled = true;
        try {
          await refreshLocationPermissionState();
          await requestBrowserLocationForSearch();
          locationGate.style.display = "none";
          manualLatitude.value = "";
          manualLongitude.value = "";
          manualLocation.value = "";
        } catch (error) {
          setLocationStatus(getLocationFailureMessage(error));
          await refreshLocationPermissionState();
        } finally {
          useBrowserLocation.disabled = false;
        }
      });
      startLocationPermission.addEventListener("click", requestEntryLocationPermission);

      renderSteps(["Choose a demo scenario", "The page will call POST /demo", "MCP clients keep using POST /mcp"]);
      renderStructured({});
      renderLocationDiagnostics();
      setLocationStatus("Pulsa Permitir ubicación al entrar para usar GPS real. Si este navegador no muestra el permiso nativo, escribe una dirección completa o coordenadas.");
      window.setTimeout(requestInitialBrowserLocation, 600);
    </script>
  </body>
</html>`;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "content-type, accept, mcp-session-id, mcp-protocol-version, authorization",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      ...(init.headers || {})
    }
  });
}

function html(data, init = {}) {
  return new Response(data, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "permissions-policy": "geolocation=(self)",
      "feature-policy": "geolocation 'self'",
      ...(init.headers || {})
    }
  });
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data ? { data } : {}) }
  };
}

async function handleMcp(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, accept, mcp-session-id, mcp-protocol-version, authorization",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS"
      }
    });
  }

  if (request.method === "GET") {
    return json({
      ok: true,
      name: "parkshare-alexa-mcp",
      protocolVersion: PROTOCOL_VERSION,
      tools: toolDefinitions.map((tool) => tool.name)
    });
  }

  if (request.method === "DELETE") {
    return new Response(null, {
      status: 204,
      headers: { "access-control-allow-origin": "*" }
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json(rpcError(null, -32700, "Parse error", { message: error.message }), { status: 400 });
  }

  if (Array.isArray(payload)) {
    const results = await Promise.all(payload.map(dispatchRpc));
    return json(results.filter(Boolean));
  }

  return json(await dispatchRpc(payload));
}

async function handleDemo(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS"
      }
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ error: "Invalid demo request", message: error.message }, { status: 400 });
  }

  const tool = payload.tool;
  const args = payload.arguments || {};

  if (!tool || typeof tool !== "string") {
    return json({ error: "Missing demo tool" }, { status: 400 });
  }

  try {
    const toolCanUseCurrentLocation = [
      "find_nearby_place",
      "find_parking_near_destination",
      "get_road_alerts"
    ].includes(tool);

    if (
      toolCanUseCurrentLocation &&
      !hasValidCoordinates(args.latitude, args.longitude) &&
      typeof args.locationText === "string" &&
      args.locationText.trim()
    ) {
      const geocoded = await geocodeLocationText(args.locationText.trim(), getGeocodeBiasFromArgs(args));
      if (geocoded) {
        args.latitude = geocoded.latitude;
        args.longitude = geocoded.longitude;
        args.locationSource = "manual_geocoded_location";
        args.locationLabel = geocoded.label;
        args.geocoder = geocoded.geocoder;
      } else {
        args.locationSource = "manual_location_failed";
        args.locationLabel = args.locationText.trim();
      }
    }

    const requestLocation =
      args.allowApproximateNetworkLocation === true
        ? getApproximateRequestLocation(request)
        : null;
    if (
      toolCanUseCurrentLocation &&
      !hasValidCoordinates(args.latitude, args.longitude) &&
      requestLocation
    ) {
      args.latitude = requestLocation.latitude;
      args.longitude = requestLocation.longitude;
      args.locationSource = requestLocation.source;
      args.locationLabel = requestLocation.label;
    }

    const result = await callParkShareTool(tool, args);
    return json({
      tool,
      content: [{ type: "text", text: result.spoken }],
      structuredContent: result.data
    });
  } catch (error) {
    return json({ error: error.message }, { status: 400 });
  }
}

async function dispatchRpc(payload) {
  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return rpcError(payload?.id, -32600, "Invalid Request");
  }

  try {
    switch (payload.method) {
      case "initialize":
        return rpcResult(payload.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "parkshare-alexa-mcp", version: "0.1.0" },
          instructions:
            "Use ParkShare tools for parking, nearby-place search, road alerts and parking spot release flows."
        });
      case "notifications/initialized":
        return null;
      case "ping":
        return rpcResult(payload.id, {});
      case "tools/list":
        return rpcResult(payload.id, {
          tools: toolDefinitions.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        });
      case "tools/call":
        return callTool(payload);
      default:
        return rpcError(payload.id, -32601, `Method not found: ${payload.method}`);
    }
  } catch (error) {
    return rpcError(payload.id, -32000, error.message);
  }
}

async function callTool(payload) {
  const name = payload.params?.name;
  const args = payload.params?.arguments || {};

  if (!name) {
    return rpcError(payload.id, -32602, "Missing tool name");
  }

  const result = await callParkShareTool(name, args);

  return rpcResult(payload.id, {
    content: [{ type: "text", text: result.spoken }],
    structuredContent: result.data
  });
}

async function callParkShareTool(name, args) {
  switch (name) {
    case "find_nearby_place":
      return findNearbyPlace(args);
    case "find_parking_near_destination":
      return findParkingNearDestination(args);
    case "get_road_alerts":
      return getRoadAlerts(args);
    case "release_parking_spot":
      return releaseParkingSpot(args);
    case "confirm_previous_spot_free":
      return confirmPreviousSpotFree(args);
    default:
      throw new Error(`Unknown ParkShare tool: ${name}`);
  }
}

function hasValidCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function getGeocodeBiasFromArgs(args) {
  if (!hasValidCoordinates(args.geocodeBiasLatitude, args.geocodeBiasLongitude)) {
    return null;
  }

  const radius = Number(args.geocodeBiasRadiusMeters || 50000);
  return {
    latitude: Number(args.geocodeBiasLatitude),
    longitude: Number(args.geocodeBiasLongitude),
    radiusMeters: Number.isFinite(radius) ? Math.min(Math.max(radius, 5000), 100000) : 50000
  };
}

function formatMinutes(minutes) {
  return Number(minutes) === 1 ? "1 minute" : `${minutes} minutes`;
}

function formatAvailabilityForSpeech(place) {
  if (place.availability === "open") return " It appears open now.";
  if (place.availability === "closed") return " It may be closed now, so check before going.";
  return "";
}

function describeStartLocation(source, label) {
  if (source === "browser_geolocation") {
    return "your precise browser location";
  }

  if (source === "cached_browser_geolocation") {
    return "your saved browser location from this session";
  }

  if (source === "typed_coordinates") {
    return "the exact coordinates you entered";
  }

  if (source === "manual_geocoded_location" || source === "manual_location_text") {
    return `the typed address ${label}`;
  }

  if (source === "network_approximate_location" || source === "ip_approximate_location") {
    return "your approximate network location";
  }

  return label || "the selected location";
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeLocationText(text, biasHint = null) {
  if (needsLocationContextForTypedAddress(text, biasHint)) {
    return null;
  }

  const queries = buildGeocodeQueries(text);

  for (const query of queries) {
    const nominatim = await geocodeWithNominatim(query, biasHint);
    if (nominatim) return nominatim;
  }

  for (const query of queries) {
    const photon = await geocodeWithPhoton(query, biasHint);
    if (photon) return photon;
  }

  return null;
}

function buildGeocodeQueries(text) {
  const cleaned = String(text || "").trim();
  const lower = cleaned.toLowerCase();
  const baseVariants = [
    ...buildSpanishStreetQueryVariants(cleaned),
    ...buildImplicitSpanishStreetQueryVariants(cleaned),
    cleaned
  ];
  const variants = [];
  const mentionsCountry =
    lower.includes(" españa") ||
    lower.includes(",españa") ||
    lower.includes(" spain") ||
    lower.includes(",spain") ||
    lower.endsWith(" es");

  for (const variant of baseVariants) {
    if (!variant) continue;
    variants.push(variant);
    if (!mentionsCountry) {
      variants.push(`${variant}, España`);
      variants.push(`${variant}, Spain`);
    }
  }

  return [...new Set(variants.filter(Boolean))];
}

function buildSpanishStreetQueryVariants(text) {
  const match = String(text || "").trim().match(/^(calle|avenida|avda\.?|paseo|plaza|carretera)\s+(?!de\s|del\s|de la\s)(.+)$/i);
  if (!match) return [];

  const prefix = match[1];
  const rest = match[2];
  return [`${prefix} de ${rest}`];
}

function buildImplicitSpanishStreetQueryVariants(text) {
  const raw = String(text || "").trim();
  if (!raw || /\b(calle|avenida|avda\.?|paseo|plaza|carretera|camino|ronda|trav[eé]s[ií]a|carrer|street|road|avenue)\b/i.test(raw)) {
    return [];
  }

  const split = splitImplicitStreetHouseNumber(raw);
  if (!split) return [];

  const streetWithCommaNumber = `${split.street}, ${split.houseNumber}${split.suffix}`;
  const streetWithTrailingNumber = `${split.street} ${split.houseNumber}${split.suffix}`;
  return [
    `Calle de ${streetWithCommaNumber}`,
    `Calle ${streetWithCommaNumber}`,
    `Calle de ${streetWithTrailingNumber}`,
    `Calle ${streetWithTrailingNumber}`
  ];
}

function splitImplicitStreetHouseNumber(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(.+?)\s+(\d+[a-z]?)(.*)$/i);
  if (!match || !/[a-záéíóúñ]/i.test(match[1])) return null;

  const suffix = String(match[3] || "");
  if (suffix && !/^\s*(,|\b(zaragoza|madrid|barcelona|valencia|malaga|málaga|sevilla|santander|montblanc|españa|espana|spain)\b)/i.test(suffix)) {
    return null;
  }

  return {
    street: match[1].trim(),
    houseNumber: match[2].trim(),
    suffix
  };
}

function needsLocationContextForTypedAddress(text, biasHint = null) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return true;
  if (biasHint) return false;
  if (getCountryConstraint(text, null) || getLocalityHint(text)) return false;
  return true;
}

function typedQueryHasHouseNumber(text) {
  return extractTypedHouseNumber(text) !== null;
}

function extractTypedHouseNumber(text) {
  const raw = String(text || "").trim();
  const commaNumber = raw.match(/\b(calle|avenida|avda\.?|paseo|plaza|carretera|camino|ronda|trav[eé]s[ií]a|carrer|street|road|avenue)\b[^,]*[a-záéíóúñ][^,]*,\s*(\d+[a-z]?)/i);
  if (commaNumber) return normalizeHouseNumber(commaNumber[2]);

  const trailingNumber = raw.match(/\b(calle|avenida|avda\.?|paseo|plaza|carretera|camino|ronda|trav[eé]s[ií]a|carrer|street|road|avenue)\b\s+(.+?)\s+(\d+[a-z]?)(?=,|\s+(?:zaragoza|madrid|barcelona|valencia|malaga|málaga|sevilla|santander|montblanc|españa|espana|spain|colombia)\b|$)/i);
  if (trailingNumber && /[a-záéíóúñ]/i.test(trailingNumber[2])) {
    return normalizeHouseNumber(trailingNumber[3]);
  }

  const implicitStreetNumber = splitImplicitStreetHouseNumber(raw);
  if (implicitStreetNumber) {
    return normalizeHouseNumber(implicitStreetNumber.houseNumber);
  }

  return null;
}

function normalizeHouseNumber(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^0+/, "");
}

async function geocodeWithNominatim(query, biasHint = null) {
  const localityHint = getLocalityHint(query) || biasHint;
  const countryConstraint = getCountryConstraint(query, localityHint);
  const viewbox = localityHint ? viewboxForRadius(localityHint, localityHint.radiusMeters) : null;
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=jsonv2&addressdetails=1&limit=8` +
    (countryConstraint ? `&countrycodes=${countryConstraint.codes.join(",")}` : "") +
    (viewbox ? `&viewbox=${viewbox}&bounded=1` : "") +
    `&q=${encodeURIComponent(query)}`;
  const data = await fetchJsonWithTimeout(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "ParkShare-Alexa-MCP-Demo/0.1"
    }
  }, geocodingTimeoutMs);

  if (!Array.isArray(data)) {
    return null;
  }

  const best = data
    .filter((result) =>
      hasValidCoordinates(result.lat, result.lon) &&
      resultMatchesCountry(result, countryConstraint) &&
      resultMatchesLocality(result, localityHint) &&
      resultMatchesAddressPrecision(result, query) &&
      resultMatchesTypedAddressText(result, query)
    )
    .sort((a, b) => scoreGeocodeResult(b, localityHint) - scoreGeocodeResult(a, localityHint))[0];

  if (!best || !hasValidCoordinates(best.lat, best.lon)) {
    return null;
  }

  return {
    latitude: Number(best.lat),
    longitude: Number(best.lon),
    label: best.display_name || query,
    geocoder: "nominatim",
    precision: getNominatimPrecision(best),
    address: best.address || {}
  };
}

async function geocodeWithPhoton(query, biasHint = null) {
  if (typedQueryHasHouseNumber(query)) {
    return null;
  }

  const localityHint = getLocalityHint(query) || biasHint;
  const countryConstraint = getCountryConstraint(query, localityHint);
  const url =
    `https://photon.komoot.io/api/?` +
    `limit=5` +
    (localityHint ? `&lat=${localityHint.latitude}&lon=${localityHint.longitude}` : "") +
    `&q=${encodeURIComponent(query)}`;
  const data = await fetchJsonWithTimeout(url, {
    headers: {
      "accept": "application/json"
    }
  }, geocodingTimeoutMs);

  const features = Array.isArray(data?.features) ? data.features : [];
  const best = features
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates || [];
      const longitude = Number(coordinates[0]);
      const latitude = Number(coordinates[1]);
      if (!hasValidCoordinates(latitude, longitude)) return null;
      const properties = feature.properties || {};
      if (
        !photonResultMatchesCountry(properties, countryConstraint) ||
        !photonResultMatchesLocality(properties, latitude, longitude, localityHint)
      ) {
        return null;
      }
      const label = [
        properties.name,
        properties.street,
        properties.housenumber,
        properties.city || properties.county,
        properties.state,
        properties.country
      ].filter(Boolean).join(", ");
      return {
        latitude,
        longitude,
        label: label || query,
        geocoder: "photon",
        score: scoreGeocodeResult({ lat: latitude, lon: longitude, importance: 0.5 }, localityHint),
        properties
      };
    })
    .filter(Boolean)
    .filter((result) => photonResultMatchesTypedAddressText(result.properties, result.label, query))
    .sort((a, b) => b.score - a.score)[0];

  return best
    ? {
        latitude: best.latitude,
        longitude: best.longitude,
        label: best.label,
        geocoder: best.geocoder
      }
    : null;
}

function getLocalityHint(query) {
  const lower = String(query || "").toLowerCase();
  const normalized = normalizeSearchText(query);
  if (normalized.includes(" colombia") || normalized.includes(",colombia")) {
    return null;
  }

  const hints = [
    { names: ["zaragoza"], latitude: 41.652134, longitude: -0.880943, radiusMeters: 16000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["madrid"], latitude: 40.416775, longitude: -3.70379, radiusMeters: 25000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["barcelona"], latitude: 41.387397, longitude: 2.168568, radiusMeters: 18000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["valencia"], latitude: 39.469907, longitude: -0.376288, radiusMeters: 18000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["malaga", "málaga"], latitude: 36.721302, longitude: -4.421637, radiusMeters: 18000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["sevilla", "seville"], latitude: 37.389092, longitude: -5.984459, radiusMeters: 18000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["santander"], latitude: 43.462306, longitude: -3.80998, radiusMeters: 12000, countryCodes: ["es"], requireLocalityName: true },
    { names: ["montblanc"], latitude: 41.3762, longitude: 1.1619, radiusMeters: 8000, countryCodes: ["es"], requireLocalityName: true }
  ];

  return hints.find((hint) => hint.names.some((name) => lower.includes(name))) || null;
}

function getCountryConstraint(query, localityHint) {
  const lower = normalizeSearchText(query);
  if (
    lower.includes(" espana") ||
    lower.includes(",espana") ||
    lower.includes(" españa") ||
    lower.includes(",españa") ||
    lower.includes(" spain") ||
    lower.includes(",spain") ||
    lower.endsWith(" es")
  ) {
    return { codes: ["es"], names: ["espana", "españa", "spain"] };
  }

  if (lower.includes(" colombia") || lower.includes(",colombia")) {
    return { codes: ["co"], names: ["colombia", "co"] };
  }

  if (localityHint?.countryCodes?.length) {
    return {
      codes: localityHint.countryCodes,
      names: localityHint.countryCodes.includes("es")
        ? ["espana", "españa", "spain"]
        : localityHint.countryCodes
    };
  }

  return null;
}

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDistinctiveAddressTokens(text) {
  const stopwords = new Set([
    "calle", "avenida", "avda", "paseo", "plaza", "carretera", "camino", "ronda", "travesia",
    "carrer", "street", "road", "avenue", "de", "del", "la", "las", "los", "el", "y",
    "zaragoza", "madrid", "barcelona", "valencia", "malaga", "sevilla", "santander",
    "montblanc", "espana", "spain", "colombia", "aragon", "aragón"
  ]);
  return normalizeSearchText(text)
    .replace(/[^a-z0-9ñ]+/g, " ")
    .split(/\s+/)
    .filter((token) =>
      token.length >= 4 &&
      !/^\d+[a-z]?$/.test(token) &&
      !stopwords.has(token)
    );
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function tokenAppearsInText(token, normalizedText) {
  if (normalizedText.includes(token)) return true;
  const words = normalizedText.split(/\s+/).filter(Boolean);
  return words.some((word) =>
    word.length >= 4 &&
    Math.abs(word.length - token.length) <= 1 &&
    levenshteinDistance(word, token) <= 1
  );
}

function resultMatchesTypedLabelText(label, query) {
  const tokens = getDistinctiveAddressTokens(query);
  if (!tokens.length) return true;

  const normalizedLabel = normalizeSearchText(label).replace(/[^a-z0-9ñ]+/g, " ");
  const matches = tokens.filter((token) => tokenAppearsInText(token, normalizedLabel)).length;
  return matches === tokens.length || (tokens.length >= 3 && matches / tokens.length >= 0.85);
}

function resultMatchesTypedAddressText(result, query) {
  const addressLine = [
    result.address?.road,
    result.address?.pedestrian,
    result.address?.square,
  ].filter(Boolean).join(" ");

  if (addressLine && getDistinctiveAddressTokens(query).length) {
    if (isStrictSingleStreetTokenQuery(query)) {
      const queryTokens = getDistinctiveAddressTokens(query);
      const addressTokens = getDistinctiveAddressTokens(addressLine);
      return queryTokens.length === 1 &&
        addressTokens.length === 1 &&
        tokenAppearsInText(queryTokens[0], normalizeSearchText(addressLine).replace(/[^a-z0-9ñ]+/g, " "));
    }
    return resultMatchesTypedLabelText(addressLine, query);
  }

  const label = [
    result.display_name,
    result.address?.neighbourhood
  ].filter(Boolean).join(" ");
  if (isStrictSingleStreetTokenQuery(query)) {
    return strictSingleStreetLabelMatches(label, query);
  }
  return resultMatchesTypedLabelText(label, query);
}

function photonResultMatchesTypedAddressText(properties, label, query) {
  if (properties?.street && getDistinctiveAddressTokens(query).length) {
    if (isStrictSingleStreetTokenQuery(query)) {
      const queryTokens = getDistinctiveAddressTokens(query);
      const addressTokens = getDistinctiveAddressTokens(properties.street);
      return queryTokens.length === 1 &&
        addressTokens.length === 1 &&
        tokenAppearsInText(queryTokens[0], normalizeSearchText(properties.street).replace(/[^a-z0-9ñ]+/g, " "));
    }
    return resultMatchesTypedLabelText(properties.street, query);
  }

  if (isStrictSingleStreetTokenQuery(query)) {
    return strictSingleStreetLabelMatches(label, query);
  }

  return resultMatchesTypedLabelText(label, query);
}

function isStrictSingleStreetTokenQuery(query) {
  return /\b(calle|avenida|avda|paseo|carretera|camino|ronda|trav[eé]s[ií]a|carrer|street|road|avenue)\b/i.test(query) &&
    getDistinctiveAddressTokens(query).length === 1;
}

function strictSingleStreetLabelMatches(label, query) {
  const queryTokens = getDistinctiveAddressTokens(query);
  const labelTokens = getDistinctiveAddressTokens(label);
  return queryTokens.length === 1 &&
    labelTokens.length === 1 &&
    tokenAppearsInText(queryTokens[0], normalizeSearchText(label).replace(/[^a-z0-9ñ]+/g, " "));
}

function resultMatchesAddressPrecision(result, query) {
  const expectedHouseNumber = extractTypedHouseNumber(query);
  if (!expectedHouseNumber) return true;

  const actualHouseNumber = normalizeHouseNumber(result.address?.house_number);
  if (actualHouseNumber) {
    return actualHouseNumber === expectedHouseNumber;
  }

  return Boolean(result.address?.road || result.address?.pedestrian || result.address?.square);
}

function getNominatimPrecision(result) {
  const address = result.address || {};
  if (address.house_number) return "house";
  if (address.road || address.pedestrian || address.square) return "street";
  if (address.city || address.town || address.village || address.municipality) return "locality";
  return result.type || "place";
}

function resultMatchesCountry(result, countryConstraint) {
  if (!countryConstraint) return true;
  const address = result.address || {};
  const countryCode = String(address.country_code || result.country_code || "").toLowerCase();
  if (countryCode) return countryConstraint.codes.includes(countryCode);
  const display = normalizeSearchText(result.display_name || "");
  return countryConstraint.names.some((name) => display.includes(normalizeSearchText(name)));
}

function photonResultMatchesCountry(properties, countryConstraint) {
  if (!countryConstraint) return true;
  const countryCode = String(properties.countrycode || properties.country_code || "").toLowerCase();
  if (countryCode) return countryConstraint.codes.includes(countryCode);
  const country = normalizeSearchText(properties.country || "");
  return countryConstraint.names.some((name) => country.includes(normalizeSearchText(name)));
}

function resultMatchesLocality(result, localityHint) {
  if (!localityHint) return true;
  if (localityHint.requireLocalityName && !addressMatchesLocalityName(result.address || {}, localityHint)) {
    return false;
  }
  return coordinatesMatchLocality(Number(result.lat), Number(result.lon), localityHint);
}

function photonResultMatchesLocality(properties, latitude, longitude, localityHint) {
  if (!localityHint) return true;
  if (localityHint.requireLocalityName && !propertiesMatchLocalityName(properties || {}, localityHint)) {
    return false;
  }
  return coordinatesMatchLocality(latitude, longitude, localityHint);
}

function addressMatchesLocalityName(address, localityHint) {
  if (!localityHint?.names?.length) return true;
  const localityText = [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.hamlet,
    address.suburb,
    address.city_district
  ].filter(Boolean).join(" ");
  return localityNameMatches(localityText, localityHint.names);
}

function propertiesMatchLocalityName(properties, localityHint) {
  if (!localityHint?.names?.length) return true;
  const localityText = [
    properties.city,
    properties.town,
    properties.village,
    properties.municipality,
    properties.locality,
    properties.district
  ].filter(Boolean).join(" ");
  return localityNameMatches(localityText, localityHint.names);
}

function localityNameMatches(text, names) {
  const normalized = normalizeSearchText(text).replace(/[^a-z0-9ñ]+/g, " ");
  return names.some((name) => tokenAppearsInText(normalizeSearchText(name), normalized));
}

function coordinatesMatchLocality(latitude, longitude, localityHint) {
  if (!localityHint) return true;
  const distance = haversineKm(localityHint, { latitude, longitude });
  return distance <= (localityHint.radiusMeters / 1000) * 1.15;
}

function scoreGeocodeResult(result, localityHint) {
  const base = Number(result.importance || 0);
  if (!localityHint || !hasValidCoordinates(result.lat, result.lon)) return base;

  const distance = haversineKm(localityHint, {
    latitude: Number(result.lat),
    longitude: Number(result.lon)
  });
  const localityBoost = Math.max(0, 1 - distance / (localityHint.radiusMeters / 1000));
  return base + localityBoost * 2;
}

function getApproximateRequestLocation(request) {
  const cf = request.cf || {};
  const latitude = Number(cf.latitude);
  const longitude = Number(cf.longitude);

  if (!hasValidCoordinates(latitude, longitude)) {
    return null;
  }

  const label = [cf.city, cf.region, cf.country].filter(Boolean).join(", ") || "approximate network location";
  return {
    latitude,
    longitude,
    label,
    source: "network_approximate_location"
  };
}

function haversineKm(from, to) {
  const radiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAddress(tags = {}) {
  return [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:postcode"]
  ]
    .filter(Boolean)
    .join(" ");
}

function placeFromOsmElement(element, origin, category = livePlaceCategories[0]) {
  const tags = element.tags || {};
  const latitude = element.type === "node" ? element.lat : element.center?.lat;
  const longitude = element.type === "node" ? element.lon : element.center?.lon;

  if (!hasValidCoordinates(latitude, longitude)) {
    return null;
  }

  const distanceKm = haversineKm(origin, { latitude, longitude });
  const name = tags.name || tags.brand || tags.operator || category.defaultName;

  return {
    id: `osm-${category.id}-${element.type}-${element.id}`,
    name,
    type: tags.shop || tags.amenity || tags.tourism || category.id,
    distanceKm: Number(distanceKm.toFixed(2)),
    driveMinutes: Math.max(1, Math.round((distanceKm / 35) * 60)),
    address: formatAddress(tags) || tags.operator || tags.brand || "OpenStreetMap location",
    openingHours: tags.opening_hours || null,
    parkingLeads: 0,
    latitude,
    longitude,
    source: "openstreetmap"
  };
}

function viewboxForRadius(origin, radiusMeters) {
  const latitudeDelta = radiusMeters / 111320;
  const longitudeDelta =
    radiusMeters / (111320 * Math.max(Math.cos((origin.latitude * Math.PI) / 180), 0.1));

  return [
    origin.longitude - longitudeDelta,
    origin.latitude + latitudeDelta,
    origin.longitude + longitudeDelta,
    origin.latitude - latitudeDelta
  ]
    .map((value) => Number(value.toFixed(6)))
    .join(",");
}

function placeFromNominatimResult(result, origin, category = livePlaceCategories[0]) {
  if (!hasValidCoordinates(result.lat, result.lon)) {
    return null;
  }

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const displayName = result.display_name || `OpenStreetMap ${category.singular}`;
  const name = result.name || displayName.split(",")[0] || category.defaultName;
  const distanceKm = haversineKm(origin, { latitude, longitude });

  return {
    id: `nominatim-${category.id}-${result.osm_type || "place"}-${result.osm_id || result.place_id}`,
    name,
    type: category.id,
    distanceKm: Number(distanceKm.toFixed(2)),
    driveMinutes: Math.max(1, Math.round((distanceKm / 35) * 60)),
    address: displayName,
    openingHours: result.extratags?.opening_hours || null,
    parkingLeads: 0,
    latitude,
    longitude,
    source: "openstreetmap_nominatim"
  };
}

async function fetchNominatimPlaces(origin, category, maxResults) {
  for (const radius of supermarketSearchRadiiMeters) {
    for (const term of category.nominatimQueries) {
      const params = new URLSearchParams({
        format: "jsonv2",
        extratags: "1",
        limit: String(Math.min(Math.max(maxResults * 4, 12), 25)),
        q: term,
        bounded: "1",
        viewbox: viewboxForRadius(origin, radius)
      });
      const data = await fetchJsonWithTimeout(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            "accept": "application/json",
            "user-agent": "ParkShare-Alexa-MCP-Demo/0.1"
          }
        },
        nominatimSearchTimeoutMs
      );
      const results = (data || [])
        .filter((result) => nominatimResultMatchesCategory(result, category))
        .map((result) => placeFromNominatimResult(result, origin, category))
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, maxResults);

      if (results.length) {
        return { radiusMeters: radius, results };
      }
    }
  }

  return null;
}

async function fetchNominatimSupermarkets(origin, maxResults) {
  return fetchNominatimPlaces(origin, livePlaceCategories[0], maxResults);
}

function nominatimResultMatchesCategory(result, category) {
  const resultCategory = String(result.category || result.class || "").toLowerCase();
  const resultType = String(result.type || "").toLowerCase();
  const extratags = result.extratags || {};
  const address = result.address || {};

  return category.filters.some((filter) => {
    const expectedKey = filter.key.toLowerCase();
    const values = filter.values.map((value) => String(value).toLowerCase());
    const taggedValue = String(extratags[filter.key] || address[filter.key] || "").toLowerCase();

    return resultCategory === expectedKey ||
      values.includes(resultType) ||
      values.includes(taggedValue);
  });
}

function buildOverpassCategoryQuery(category, radius, origin, rawResultLimit) {
  const filters = category.filters
    .map((filter) => {
      const valueRegex = `^(${filter.values.join("|")})$`;
      return `nwr["${filter.key}"~"${valueRegex}"](around:${radius},${origin.latitude},${origin.longitude});`;
    })
    .join("\n");

  return `
    [out:json][timeout:8];
    (
      ${filters}
    );
    out center tags ${rawResultLimit};
  `;
}

async function fetchOpenStreetMapPlaces(origin, category, maxResults) {
  const startedAt = Date.now();
  const rawResultLimit = Math.min(Math.max(maxResults * 4, 12), 25);

  for (const radius of supermarketSearchRadiiMeters) {
    const query = buildOverpassCategoryQuery(category, radius, origin, rawResultLimit);
    for (const endpoint of overpassEndpoints) {
      const remainingMs = overpassOverallTimeoutMs - (Date.now() - startedAt);
      if (remainingMs < 1000) {
        return null;
      }
      const data = await fetchJsonWithTimeout(
        `${endpoint}?data=${encodeURIComponent(query)}`,
        {
          headers: {
            "accept": "application/json",
            "user-agent": "ParkShare-Alexa-MCP-Demo/0.1"
          }
        },
        Math.min(overpassTimeoutMs, remainingMs)
      );

      const results = (data?.elements || [])
        .map((element) => placeFromOsmElement(element, origin, category))
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, maxResults);

      if (results.length) {
        return { radiusMeters: radius, results };
      }
    }
  }

  return null;
}

async function fetchOpenStreetMapSupermarkets(origin, maxResults) {
  return fetchOpenStreetMapPlaces(origin, livePlaceCategories[0], maxResults);
}

function placeDedupeKey(place) {
  const roundedLatitude = Math.round(Number(place.latitude) * 10000);
  const roundedLongitude = Math.round(Number(place.longitude) * 10000);
  const name = String(place.name || "supermarket")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `${name}:${roundedLatitude}:${roundedLongitude}`;
}

function mergePlaceResults(groups, maxResults) {
  const byKey = new Map();
  let radiusMeters = null;

  for (const group of groups) {
    if (!group?.results?.length) continue;
    radiusMeters = radiusMeters === null
      ? group.radiusMeters
      : Math.min(radiusMeters, group.radiusMeters);

    for (const place of group.results) {
      const key = placeDedupeKey(place);
      const existing = byKey.get(key);
      if (!existing || place.distanceKm < existing.distanceKm) {
        byKey.set(key, place);
      }
    }
  }

  const results = [...byKey.values()]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, Math.max(maxResults, routedCandidateLimit));

  return results.length ? { radiusMeters, results } : null;
}

async function fetchLiveSupermarketCandidates(origin, maxResults) {
  return fetchLivePlaceCandidates(origin, livePlaceCategories[0], maxResults);
}

async function fetchLivePlaceCandidates(origin, category, maxResults) {
  const candidateLimit = Math.max(maxResults, supermarketCandidateLimit);
  const lookups = await Promise.allSettled([
    fetchNominatimPlaces(origin, category, candidateLimit),
    fetchOpenStreetMapPlaces(origin, category, candidateLimit)
  ]);
  const groups = lookups
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter(Boolean);

  return mergePlaceResults(groups, maxResults);
}

function getPlaceAvailability(place, context = {}) {
  const openingHours = String(place.openingHours || "").trim();
  if (!openingHours) {
    return { status: "unknown", rank: 0 };
  }

  const lower = openingHours.toLowerCase();
  if (lower.includes("24/7")) {
    return { status: "open", rank: 0 };
  }

  const weekday = Number(context.clientWeekday);
  const minutes = Number(context.clientMinutes);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Number.isFinite(minutes)) {
    return { status: "unknown", rank: 0 };
  }

  const matchingSegments = openingHours
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment && openingHoursSegmentMatchesDay(segment, weekday));

  if (!matchingSegments.length) {
    return { status: "closed", rank: 2 };
  }

  let sawTimedRule = false;
  for (const segment of matchingSegments) {
    if (/\boff\b|closed/i.test(segment)) {
      continue;
    }

    const ranges = [...segment.matchAll(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/g)];
    if (!ranges.length) continue;
    sawTimedRule = true;

    if (ranges.some((range) => minutesInOpeningRange(minutes, range))) {
      return { status: "open", rank: 0 };
    }
  }

  return sawTimedRule ? { status: "closed", rank: 1 } : { status: "unknown", rank: 0 };
}

function openingHoursSegmentMatchesDay(segment, weekday) {
  const dayIndexes = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
  const dayRanges = [...segment.matchAll(/\b(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?/g)];
  if (!dayRanges.length) return true;

  return dayRanges.some((match) => {
    const start = dayIndexes[match[1]];
    const end = dayIndexes[match[2] || match[1]];
    if (start <= end) return weekday >= start && weekday <= end;
    return weekday >= start || weekday <= end;
  });
}

function minutesInOpeningRange(currentMinutes, match) {
  const start = Number(match[1]) * 60 + Number(match[2] || 0);
  const end = Number(match[3]) * 60 + Number(match[4] || 0);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start === end) return true;
  if (start < end) return currentMinutes >= start && currentMinutes <= end;
  return currentMinutes >= start || currentMinutes <= end;
}

async function rankSupermarketsByPracticalRoute(origin, places, maxResults, context = {}) {
  const candidates = places.slice(0, Math.min(places.length, routedCandidateLimit));
  const ranked = await Promise.all(
    candidates.map(async (place) => {
      const availability = getPlaceAvailability(place, context);
      const route = await fetchDrivingRoute(origin, place).catch(() => null);
      if (!route) {
        return {
          ...place,
          availability: availability.status,
          route: null,
          rankingAvailability: availability.rank,
          rankingDistanceKm: place.distanceKm,
          rankingMinutes: place.driveMinutes
        };
      }

      return {
        ...place,
        availability: availability.status,
        driveDistanceKm: route.distanceKm,
        driveMinutes: route.durationMinutes,
        route,
        rankingAvailability: availability.rank,
        rankingDistanceKm: place.distanceKm,
        rankingMinutes: route.durationMinutes
      };
    })
  );

  const byId = new Map(ranked.map((place) => [place.id, place]));
  for (const place of places.slice(candidates.length)) {
    const availability = getPlaceAvailability(place, context);
    byId.set(place.id, {
      ...place,
      availability: availability.status,
      route: null,
      rankingAvailability: availability.rank,
      rankingDistanceKm: place.distanceKm,
      rankingMinutes: place.driveMinutes
    });
  }

  const sorted = [...byId.values()]
    .sort((a, b) =>
      a.rankingAvailability - b.rankingAvailability ||
      a.rankingDistanceKm - b.rankingDistanceKm ||
      a.rankingMinutes - b.rankingMinutes ||
      a.name.localeCompare(b.name)
    );

  const bestRoute = sorted[0]?.route || null;
  const results = sorted.slice(0, maxResults).map(({
    route,
    rankingAvailability,
    rankingDistanceKm,
    rankingMinutes,
    ...place
  }) => place);

  return { results, route: bestRoute };
}

function thinRouteCoordinates(coordinates, maxPoints = 90) {
  if (!Array.isArray(coordinates) || coordinates.length <= maxPoints) {
    return coordinates || [];
  }

  const step = Math.ceil(coordinates.length / maxPoints);
  const thinned = coordinates.filter((_, index) => index % step === 0);
  const last = coordinates[coordinates.length - 1];
  if (thinned[thinned.length - 1] !== last) {
    thinned.push(last);
  }
  return thinned;
}

async function fetchDrivingRoute(origin, destination) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?overview=full&geometries=geojson`;
  const data = await fetchJsonWithTimeout(url, {
    headers: { "accept": "application/json" }
  }, routeTimeoutMs);

  if (!data) {
    return null;
  }

  const route = data.routes && data.routes[0];
  if (!route) {
    return null;
  }

  return {
    source: "osrm",
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    coordinates: thinRouteCoordinates(route.geometry?.coordinates || [])
  };
}

async function findNearbyPlace(args) {
  const query = String(args.query || "").toLowerCase();
  const maxResults = Math.min(Math.max(Number(args.maxResults || 3), 1), 5);
  const liveCategory = getLivePlaceCategory(query);
  const hasCoordinates = hasValidCoordinates(args.latitude, args.longitude);

  if (liveCategory && hasCoordinates) {
    const origin = {
      latitude: Number(args.latitude),
      longitude: Number(args.longitude)
    };
    const live = await fetchLivePlaceCandidates(origin, liveCategory, maxResults);

    if (live?.results?.length) {
      const ranked = await rankSupermarketsByPracticalRoute(origin, live.results, maxResults, args);
      const best = ranked.results[0];
      const route = ranked.route;

      const label = args.locationLabel || "your location";
      const source =
        args.locationSource ||
        (args.accuracyMeters ? "browser_geolocation" : "provided_coordinates");

      return {
        spoken:
          `Using ${describeStartLocation(source, label)}, ` +
          `I found ${best.name}, the nearest ${liveCategory.singular}, about ${best.distanceKm} kilometers away. ` +
          `The drive is around ${formatMinutes(best.driveMinutes)}.${formatAvailabilityForSpeech(best)}`,
        data: {
          query: args.query,
          category: liveCategory.id,
          locationSource: source,
          locationLabel: label,
          accuracyMeters: args.accuracyMeters || null,
          searchRadiusMeters: live.radiusMeters,
          originCoordinates: origin,
          results: ranked.results,
          route
        }
      };
    }
  }

  if (liveCategory) {
    if (!hasCoordinates) {
      const fallbackAttempted = args.allowApproximateNetworkLocation === true;
      const typedAddressFailed = args.locationSource === "manual_location_failed";
      return {
        spoken:
          typedAddressFailed
            ? "I could not convert that typed address into trustworthy coordinates. Please enter a fuller address with city and country, or use exact latitude and longitude."
            : fallbackAttempted
            ? "I could not get a trustworthy start location. Please allow browser GPS, enter exact coordinates, or type an address with enough city and country context."
            : "I do not have a usable start location yet. Please allow browser GPS, enter exact coordinates, or type an address with enough city and country context.",
        data: {
          query: args.query,
          category: liveCategory.id,
          locationSource: typedAddressFailed ? "manual_location_failed" : "missing_location",
          locationLabel: typedAddressFailed ? args.locationLabel : undefined,
          needsLocation: true,
          networkFallbackAttempted: fallbackAttempted,
          results: []
        }
      };
    }

    return {
      spoken:
        `I could not confirm live ${liveCategory.plural} near that location right now. I will not use a fake fallback because this scenario must be based on the real start point.`,
      data: {
        query: args.query,
        category: liveCategory.id,
        locationSource: args.locationSource || "provided_coordinates",
        locationLabel: args.locationLabel || "provided location",
        originCoordinates: {
          latitude: Number(args.latitude),
          longitude: Number(args.longitude)
        },
        liveLookupFailed: true,
        results: []
      }
    };
  }

  const matches = demoPlaces
    .filter((place) => place.type.includes(query) || place.name.toLowerCase().includes(query))
    .slice(0, maxResults);
  const results = matches.length ? matches : demoPlaces.slice(0, maxResults);
  const best = results[0];

  return {
    spoken:
      `I could not confirm live nearby places, so I used the Montblanc fallback demo. I found ${best.name}, about ${best.distanceKm} kilometers away. ` +
      `The drive is around ${formatMinutes(best.driveMinutes)} and I found ${best.parkingLeads} parking leads nearby.`,
    data: {
      query: args.query,
      locationSource: "demo_montblanc_fallback",
      originCoordinates: fallbackLocation,
      results
    }
  };
}

function findParkingNearDestination(args) {
  const requireConfirmation = args.requirePreviousSpotConfirmation !== false;
  const best = demoParking[0];
  const hasCoordinates = hasValidCoordinates(args.latitude, args.longitude);
  const needsCurrentLocation =
    String(args.destination || "").toLowerCase().includes("current location") ||
    String(args.destination || "").toLowerCase().includes("my location");
  if (needsCurrentLocation && !hasCoordinates) {
    const fallbackAttempted = args.allowApproximateNetworkLocation === true;
    const typedAddressFailed = args.locationSource === "manual_location_failed";
    return {
      spoken:
        typedAddressFailed
          ? "I could not convert that typed address into coordinates, so I cannot find nearby parking from it. Please enter a fuller address with city and country, or use exact latitude and longitude."
          : fallbackAttempted
          ? "I could not get a trustworthy start location, so I cannot find nearby parking yet. Please allow browser GPS, enter exact coordinates, or type a full address with city and country."
          : "I need your current location before I can find nearby parking. Please allow browser GPS, enter exact coordinates, or type a full address with city and country.",
      data: {
        destination: args.destination,
        locationSource: typedAddressFailed ? "manual_location_failed" : "missing_location",
        locationLabel: typedAddressFailed ? args.locationLabel : undefined,
        needsLocation: true,
        networkFallbackAttempted: fallbackAttempted,
        parkingLeads: []
      }
    };
  }

  const locationSource = args.locationSource || (hasCoordinates ? "provided_coordinates" : "demo_destination");
  const locationLabel = args.locationLabel || args.destination || "the selected destination";
  const targetDescription = hasCoordinates
    ? describeStartLocation(locationSource, locationLabel)
    : args.destination;

  return {
    spoken:
      `Using ${targetDescription}, the closest practical parking lead is ${best.distanceMeters} meters away. ` +
      (requireConfirmation
        ? "Before I start the route, did you leave your previous parking spot free?"
        : "I can start guidance with this parking target."),
    data: {
      destination: args.destination,
      locationSource,
      locationLabel,
      destinationCoordinates: hasCoordinates
        ? {
            latitude: Number(args.latitude),
            longitude: Number(args.longitude)
          }
        : null,
      requirePreviousSpotConfirmation: requireConfirmation,
      parkingLeads: demoParking
    }
  };
}

function getRoadAlerts(args) {
  const primary = demoAlerts[0];
  const hasCoordinates = hasValidCoordinates(args.latitude, args.longitude);
  const needsCurrentLocation =
    String(args.origin || "").toLowerCase().includes("current_location") ||
    String(args.origin || "").toLowerCase().includes("current location") ||
    String(args.origin || "").toLowerCase().includes("my location");
  if (needsCurrentLocation && !hasCoordinates) {
    const fallbackAttempted = args.allowApproximateNetworkLocation === true;
    const typedAddressFailed = args.locationSource === "manual_location_failed";
    return {
      spoken:
        typedAddressFailed
          ? "I could not convert that typed address into coordinates, so I cannot check road alerts from it. Please enter a fuller address with city and country, or use exact latitude and longitude."
          : fallbackAttempted
          ? "I could not get a trustworthy start location, so I cannot check road alerts from your position yet. Please allow browser GPS, enter exact coordinates, or type a full address with city and country."
          : "I need your current location before I can check road alerts. Please allow browser GPS, enter exact coordinates, or type a full address with city and country.",
      data: {
        origin: args.origin || "current_location",
        locationSource: typedAddressFailed ? "manual_location_failed" : "missing_location",
        locationLabel: typedAddressFailed ? args.locationLabel : undefined,
        needsLocation: true,
        networkFallbackAttempted: fallbackAttempted,
        destination: args.destination,
        alerts: []
      }
    };
  }

  const locationSource = args.locationSource || (hasCoordinates ? "provided_coordinates" : "demo_origin");
  const locationLabel = args.locationLabel || args.origin || "current location";
  const originDescription = hasCoordinates
    ? describeStartLocation(locationSource, locationLabel)
    : args.origin || "current location";

  return {
    spoken:
      `Using ${originDescription}, I found ${demoAlerts.length} community alerts on the route to ${args.destination}. ` +
      `${primary.label} is ${primary.distanceKm} kilometers ahead. ` +
      `The alternate route is about ${primary.alternateRouteDeltaMinutes} minutes slower.`,
    data: {
      origin: args.origin || "current_location",
      locationSource,
      locationLabel,
      originCoordinates: hasCoordinates
        ? {
            latitude: Number(args.latitude),
            longitude: Number(args.longitude)
          }
        : null,
      destination: args.destination,
      includeAlternativeRoute: args.includeAlternativeRoute !== false,
      alerts: demoAlerts
    }
  };
}

function releaseParkingSpot(args) {
  const released = (args.confirmation || "driver_confirmed_free") === "driver_confirmed_free";

  return {
    spoken: released
      ? "Done. I marked your previous parking spot as free for nearby ParkShare drivers."
      : "Okay. I will not mark that parking spot as free.",
    data: {
      parkingSessionId: args.parkingSessionId || "demo-session",
      spotStatus: released ? "free" : "not_released",
      confidence: released ? "driver_confirmed" : "driver_declined",
      expiresInMinutes: released ? 20 : 0,
      coordinates:
        args.latitude && args.longitude
          ? { latitude: args.latitude, longitude: args.longitude }
          : { latitude: 41.3762, longitude: 1.1619 }
    }
  };
}

function confirmPreviousSpotFree(args) {
  if (args.answer === "ask_driver") {
    return {
      spoken: "Before I start the new route, did you leave your previous parking spot free?",
      data: {
        needsDriverAnswer: true,
        parkingSessionId: args.parkingSessionId || "demo-session"
      }
    };
  }

  if (args.answer === "yes") {
    return releaseParkingSpot({
      parkingSessionId: args.parkingSessionId,
      confirmation: "driver_confirmed_free"
    });
  }

  return {
    spoken: "Okay. I will keep the previous spot private and will not publish it as free.",
    data: {
      needsDriverAnswer: false,
      parkingSessionId: args.parkingSessionId || "demo-session",
      spotStatus: "not_released"
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    void env;
    void ctx;

    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      return handleMcp(request);
    }

    if (url.pathname === "/demo") {
      return handleDemo(request);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      if (url.pathname === "/health") {
        return json({
          ok: true,
          name: "parkshare-alexa-mcp",
          protocolVersion: PROTOCOL_VERSION,
          endpoint: "/mcp",
          tools: toolDefinitions.map((tool) => tool.name)
        });
      }

      return html(page);
    }

    return new Response("Not found", { status: 404 });
  }
};
