# ParkShare Alexa+ MCP Server

This is a real MCP Streamable HTTP server for the ParkShare Alexa+ mobility copilot.

It exposes ParkShare actions as MCP tools so an Alexa+ agent or MCP-compatible client can call parking, places, road-alert, and spot-release workflows.

## Current status

The server is functional and uses deterministic demo data. The tool boundary is real: clients call `tools/list` and `tools/call` over JSON-RPC HTTP.

Next step for production is replacing the demo data in `src/parkshareTools.js` with calls to the real ParkShare backend.

## Tools

- `find_nearby_place`
- `find_parking_near_destination`
- `get_road_alerts`
- `release_parking_spot`
- `confirm_previous_spot_free`

## Run locally

```bash
npm start
```

Server URL:

```text
http://localhost:8787/mcp
```

Health check:

```text
http://localhost:8787/health
```

## Smoke test

Start the server in one terminal, then run:

```bash
npm run smoke
```

Expected result:

- `initialize` succeeds.
- `tools/list` returns the ParkShare tools.
- `tools/call` can call `find_nearby_place`.

## Alexa+ positioning

For the Amazon hackathon, this should be described as the real MCP server behind the ParkShare Alexa+ copilot.

The existing web simulator remains useful as a visual demo and fallback, but the primary technical implementation can now be:

```text
Alexa+ -> MCP Streamable HTTP server -> ParkShare tools -> parking/routes/alerts/search
```

## Replacing demo data with ParkShare APIs

Replace the functions in `src/parkshareTools.js`:

- `findNearbyPlace`
- `findParkingNearDestination`
- `getRoadAlerts`
- `releaseParkingSpot`
- `confirmPreviousSpotFree`

Each function should call the relevant ParkShare backend endpoint and return:

```js
{
  spoken: "Short voice-safe answer for Alexa",
  data: {
    "...": "structured result for the client"
  }
}
```

## Submission wording

ParkShare exposes a real MCP Streamable HTTP server for Alexa+. The server provides tools for current-location place search, destination parking guidance, route alerts, previous-spot confirmation, and collaborative parking spot release. The demo data can be replaced by ParkShare production APIs without changing the Alexa+ tool interface.

