# ParkShare Alexa+ MCP Driving Copilot

ParkShare is a parking and driving assistant extended with an Alexa+ MCP server for the Amazon Developer Hackathon.

This submission contains:

- `worker/`: Cloudflare/Sites-compatible HTTPS MCP endpoint used for deployment.
- `mcp-server/`: real MCP Streamable HTTP server exposing ParkShare mobility tools.
- `companion-simulator/`: visual web demo for the video and judges.
- `docs/`: Devpost text, demo script, action plan and upload checklist.

## Primary implementation

The primary implementation is the MCP endpoint, not the visual simulator.

Published private Site:

```text
https://parkshare-alexa-mcp.jonycorcoles2015.chatgpt.site
```

MCP endpoint:

```text
https://parkshare-alexa-mcp.jonycorcoles2015.chatgpt.site/mcp
```

Architecture:

```text
Alexa+ -> ParkShare MCP server -> ParkShare mobility tools -> parking/routes/alerts/search
```

The deployable Sites worker lives in `worker/index.js` and exposes `/mcp` over HTTPS after publication.

The server uses real visitor-provided location, live OpenStreetMap place/parking lookups, official road-alert lookup when available, and ParkShare user-released parking spots from the active session. It does not fabricate parking stock or road alerts when live data is unavailable.

## MCP tools

- `find_nearby_place`
- `find_parking_near_destination`
- `get_road_alerts`
- `release_parking_spot`
- `confirm_previous_spot_free`

## Run the MCP server

```bash
cd mcp-server
npm start
```

MCP endpoint:

```text
http://localhost:8787/mcp
```

Health check:

```text
http://localhost:8787/health
```

## Smoke test

Start the server, then run:

```bash
cd mcp-server
npm run smoke
```

The smoke test verifies:

- `initialize`
- `tools/list`
- `tools/call` using `find_nearby_place`

## Build the deployable Sites worker

```bash
npm run build
npm run validate
```

The build creates:

```text
dist/
├── .openai/
│   └── hosting.json
└── server/
    └── index.js
```

`dist/server/index.js` exports `default.fetch(request, env, ctx)` for Sites.

## Companion simulator

Open this file in a browser:

```text
companion-simulator/index.html
```

The simulator is only for explaining the experience visually. The MCP server is the actual Alexa+ technical implementation.

## Devpost

Use these files:

- `docs/parkshare_devpost_final_fields.md`
- `docs/parkshare_demo_video_script_english.md`
- `docs/parkshare_submission_upload_checklist.md`

## Access note

The Site is currently private to the owner account. Before submitting to external judges, either make it public or invite the reviewer emails required by the hackathon.

