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
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; }
      main {
        width: min(920px, calc(100vw - 32px));
        background: white;
        border: 1px solid #d6ddd9;
        border-radius: 8px;
        padding: 28px;
        box-shadow: 0 18px 45px rgba(22, 33, 29, 0.14);
      }
      h1 { margin: 0 0 8px; font-size: clamp(28px, 5vw, 48px); line-height: 1; }
      p { color: #5d6963; line-height: 1.55; }
      code { background: #eef2f0; border-radius: 6px; padding: 3px 6px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
      .card { border: 1px solid #d6ddd9; border-radius: 8px; padding: 14px; }
      .card strong { display: block; margin-bottom: 6px; }
      @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>ParkShare Alexa+ MCP</h1>
      <p>
        A production-style HTTPS endpoint for the ParkShare Alexa+ mobility copilot.
        MCP clients can call <code>POST /mcp</code> to discover and use parking, nearby-place,
        road-alert and spot-release tools.
      </p>
      <div class="grid">
        <div class="card"><strong>Endpoint</strong><code>/mcp</code></div>
        <div class="card"><strong>Protocol</strong>MCP Streamable HTTP / JSON-RPC</div>
        <div class="card"><strong>Tools</strong>${toolDefinitions.length} ParkShare tools</div>
        <div class="card"><strong>Status</strong>Ready for Alexa+ demo connection</div>
      </div>
    </main>
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
