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
    id: "parking-mercadona-east",
    label: "Free street parking lead",
    distanceMeters: 230,
    confidence: "fresh-community-signal",
    walkingMinutes: 3,
    status: "likely_free"
  },
  {
    id: "parking-mercadona-north",
    label: "Second practical option",
    distanceMeters: 410,
    confidence: "recent-area-signal",
    walkingMinutes: 6,
    status: "unknown_but_likely"
  },
  {
    id: "parking-mercadona-wide",
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
    label: "Find supermarket",
    driver: "Alexa, ask ParkShare to find the nearest supermarket.",
    tool: "find_nearby_place",
    args: { query: "supermarket", maxResults: 3 },
    context: "Current-location search from Montblanc camping area",
    steps: [
      "Read current driver location",
      "Search nearby places without city limits",
      "Rank results by practical driving distance",
      "Check parking leads around the best result"
    ]
  },
  parking: {
    label: "Find parking",
    driver: "Alexa, ask ParkShare to guide me to parking near Mercadona Montblanc.",
    tool: "find_parking_near_destination",
    args: { destination: "Mercadona Montblanc", requirePreviousSpotConfirmation: true },
    context: "Destination parking guidance",
    steps: [
      "Load destination context",
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
    context: "Community route alerts",
    steps: [
      "Read current route",
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
        min-height: 300px;
        position: relative;
        overflow: hidden;
        background:
          linear-gradient(90deg, rgba(24, 112, 76, 0.08) 1px, transparent 1px),
          linear-gradient(0deg, rgba(24, 112, 76, 0.08) 1px, transparent 1px),
          #f7f4ea;
        background-size: 48px 48px;
      }
      .road, .route {
        position: absolute;
        border-radius: 999px;
        transform-origin: center;
      }
      .road.main { width: 120%; height: 34px; left: -10%; top: 52%; background: #c7c0b4; transform: rotate(-16deg); }
      .road.branch { width: 65%; height: 26px; left: 42%; top: 28%; background: #d6cec1; transform: rotate(43deg); }
      .route { width: 54%; height: 8px; left: 22%; top: 49%; background: #215f88; transform: rotate(-16deg); box-shadow: 0 0 0 4px rgba(33, 95, 136, 0.12); }
      .pin {
        position: absolute;
        display: grid;
        place-items: center;
        min-width: 72px;
        min-height: 38px;
        padding: 0 10px;
        border-radius: 8px;
        color: white;
        font-size: 13px;
        font-weight: 850;
        box-shadow: 0 10px 20px rgba(23, 33, 29, 0.18);
      }
      .you { left: 18%; top: 55%; background: #18704c; }
      .place { right: 18%; top: 38%; background: #215f88; }
      .parking { right: 28%; bottom: 20%; background: #6b5a2d; }
      .alert { right: 36%; top: 24%; min-width: 38px; background: #b56a14; }
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
        .actions, .meta-grid { grid-template-columns: 1fr; }
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
            Interactive demo for the ParkShare Alexa+ mobility copilot. These buttons call the live
            <code>POST /mcp</code> endpoint on this Site and render the answer as a driver-facing assistant.
          </p>
          <div class="status">MCP endpoint live</div>
        </section>

        <section>
          <h2>Demo scenarios</h2>
          <div class="actions" id="actions"></div>
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
          <div class="road main"></div>
          <div class="road branch"></div>
          <div class="route"></div>
          <div class="pin you">You</div>
          <div class="pin place" id="placePin">Place</div>
          <div class="pin parking">Parking</div>
          <div class="pin alert">Alert</div>
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
    <script>
      const scenarios = ${JSON.stringify(pageScenarios)};
      const actions = document.querySelector("#actions");
      const conversation = document.querySelector("#conversation");
      const assistantAnswer = document.querySelector("#assistantAnswer");
      const contextTitle = document.querySelector("#contextTitle");
      const placePin = document.querySelector("#placePin");
      const steps = document.querySelector("#steps");
      const results = document.querySelector("#results");
      const rawResponse = document.querySelector("#rawResponse");

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

      async function callScenario(key) {
        const scenario = scenarios[key];
        document.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        addMessage("driver", scenario.driver);
        assistantAnswer.textContent = "Calling ParkShare MCP...";
        contextTitle.textContent = scenario.context;
        placePin.textContent = scenario.label.replace("Find ", "");
        renderSteps(scenario.steps);

        try {
          const response = await fetch("/mcp", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method: "tools/call",
              params: { name: scenario.tool, arguments: scenario.args }
            })
          });
          const data = await response.json();
          const answer = data.result && data.result.content && data.result.content[0]
            ? data.result.content[0].text
            : "The MCP server answered, but no speech text was returned.";

          assistantAnswer.textContent = answer;
          addMessage("assistant", answer);
          renderStructured(data.result ? data.result.structuredContent : data);
          rawResponse.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          assistantAnswer.textContent = "The browser could not call the MCP endpoint.";
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

      renderSteps(["Choose a demo scenario", "The page will call POST /mcp", "The assistant answer will appear here"]);
      renderStructured({});
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

function callTool(payload) {
  const name = payload.params?.name;
  const args = payload.params?.arguments || {};

  if (!name) {
    return rpcError(payload.id, -32602, "Missing tool name");
  }

  const result = callParkShareTool(name, args);

  return rpcResult(payload.id, {
    content: [{ type: "text", text: result.spoken }],
    structuredContent: result.data
  });
}

function callParkShareTool(name, args) {
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

function findNearbyPlace(args) {
  const query = String(args.query || "").toLowerCase();
  const maxResults = Math.min(Math.max(Number(args.maxResults || 3), 1), 5);
  const matches = demoPlaces
    .filter((place) => place.type.includes(query) || place.name.toLowerCase().includes(query))
    .slice(0, maxResults);
  const results = matches.length ? matches : demoPlaces.slice(0, maxResults);
  const best = results[0];

  return {
    spoken:
      `I found ${best.name}, about ${best.distanceKm} kilometers away. ` +
      `The drive is around ${best.driveMinutes} minutes and I found ${best.parkingLeads} parking leads nearby.`,
    data: {
      query: args.query,
      locationSource: args.latitude && args.longitude ? "provided_coordinates" : "demo_current_location",
      results
    }
  };
}

function findParkingNearDestination(args) {
  const requireConfirmation = args.requirePreviousSpotConfirmation !== false;
  const best = demoParking[0];

  return {
    spoken:
      `The closest practical parking lead near ${args.destination} is ${best.distanceMeters} meters away. ` +
      (requireConfirmation
        ? "Before I start the route, did you leave your previous parking spot free?"
        : "I can start guidance with this parking target."),
    data: {
      destination: args.destination,
      requirePreviousSpotConfirmation: requireConfirmation,
      parkingLeads: demoParking
    }
  };
}

function getRoadAlerts(args) {
  const primary = demoAlerts[0];

  return {
    spoken:
      `I found ${demoAlerts.length} community alerts on the route to ${args.destination}. ` +
      `${primary.label} is ${primary.distanceKm} kilometers ahead. ` +
      `The alternate route is about ${primary.alternateRouteDeltaMinutes} minutes slower.`,
    data: {
      origin: args.origin || "current_location",
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

      return new Response(page, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
