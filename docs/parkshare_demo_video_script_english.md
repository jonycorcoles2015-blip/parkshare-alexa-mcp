# ParkShare - Demo Video Script

Target: under 3 minutes.

Language: English.

## 0:00 - 0:15 Opening

Say:

Drivers do not only need a map. They need to know where to park, what is nearby, what is happening on the road, and whether they should release their previous parking spot for someone else.

This is ParkShare, extended with an Alexa+ MCP mobility copilot for the Amazon Developer Hackathon.

## 0:15 - 0:35 Show the product context

Show:

- ParkShare mobile app screenshots or real app screen.
- Current location.
- Search or map flow.

Say:

ParkShare is a real mobile parking and driving app. It combines collaborative parking, nearby-place search, route context, voice-first actions, and road alerts.

For this hackathon, we added a real MCP Streamable HTTP server that exposes ParkShare actions as Alexa+ tools.

## 0:35 - 1:05 Scenario 1: nearby search

Show the MCP server or simulator, then click:

Find supermarket

Say:

In this demo scenario, the driver asks ParkShare to find the nearest supermarket from the judge's current browser location. This is important outside big cities, where the nearest useful place might be several kilometers away.

The Alexa+ MCP tool can receive driver coordinates from the app. For this browser demo, the page first asks for browser GPS permission. If the user does not allow precise location, the server tries an approximate network location, expands the search with OpenStreetMap data, ranks supermarkets by practical distance, and draws a driving route with OSRM when available.

## 1:05 - 1:35 Scenario 2: parking-aware route

Click:

Find parking

Say:

Before opening a new route, ParkShare asks whether the driver left the previous spot free. That keeps the community parking map useful and avoids losing parking data when the driver moves away.

Here, the MCP server finds the closest practical parking option near the destination and triggers the parking release confirmation.

## 1:35 - 2:05 Scenario 3: road alerts

Click:

Road alerts

Say:

ParkShare also supports community road alerts, such as mobile controls, speed cameras, accidents, roadworks, and traffic jams.

The MCP server checks the active route, finds one alert, and explains that an alternate route is five minutes slower but avoids the alert area.

## 2:05 - 2:25 Scenario 4: release spot

Click:

Release spot

Say:

If the driver confirms the spot is free, ParkShare marks it as available for nearby users with expiry and confidence rules.

This turns parking into a collaborative real-time signal.

## 2:25 - 2:50 Closing

Say:

This project uses the Alexa+ MCP path for the hackathon. The repository includes the MCP server source code, setup instructions, smoke test, scripted flows, and a companion demo UI.

The next step is connecting this MCP layer more deeply to the real ParkShare mobile APIs and improving the voice-first driving experience.

ParkShare is a mobility copilot for parking, places, safer routes, and community data.

