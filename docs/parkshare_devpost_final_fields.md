# ParkShare - Devpost Final Fields

Use this for the Amazon Developer Hackathon submission.

## Project title

ParkShare Alexa+ Driving Copilot

## Tagline

An Alexa+ MCP mobility copilot that helps drivers find parking, nearby places, safer routes, and community road alerts through natural conversation.

## Primary track

Alexa+

## Mini challenges

Select Open Source only if the repository is public and includes an open-source license.

Do not select AWS Builder unless a real AWS integration is added and documented.

## Project description

ParkShare is a real parking and driving app extended with a real MCP Streamable HTTP server for the Amazon Developer Hackathon Alexa+ track.

The demo shows how a driver could ask for nearby places, parking guidance, road alerts, and free-space reporting through a conversational mobility copilot. Instead of being only a map, ParkShare connects destination search, collaborative parking availability, road safety alerts, and voice-first driving workflows.

The submitted MCP server exposes ParkShare actions as tools for Alexa+: current-location place search, destination parking guidance, route alerts, previous-spot confirmation, and collaborative parking spot release. A companion web simulator is included only as a visual demo for judges and video recording.

## Inspiration

Drivers often need answers while moving: where can I park, what is nearby, are there road alerts, and should I release my previous parking spot? Traditional map apps are strong for navigation, but they do not focus enough on collaborative parking availability and voice-first parking decisions.

ParkShare was built around the real driver problem: reaching a destination is not enough if the driver still has to search for parking, type while driving, or forget to release a free spot for other users.

## What it does

ParkShare lets a driver:

1. Search for any destination or nearby place.
2. Find useful places from the current location, not only from a fixed city.
3. Get parking-aware guidance around the destination.
4. Confirm whether the previous parking spot was left free before starting a new route.
5. Report free or occupied parking spaces.
6. Receive route context and community road-alert information.
7. Use an Alexa+ MCP copilot to ask for parking, nearby places, route alerts, and spot release actions.

## How we built it

The ParkShare mobile product uses Flutter, Google Maps, location services, destination search, speech-to-text, text-to-speech, Android native integrations, and backend APIs for parking sessions, routes, places, road alerts, observability, and assistant behavior.

For the hackathon, we built a real MCP Streamable HTTP server using Node.js. The server exposes five ParkShare tools:

- `find_nearby_place`
- `find_parking_near_destination`
- `get_road_alerts`
- `release_parking_spot`
- `confirm_previous_spot_free`

The repository also includes a static web simulator for presentation purposes. The simulator includes scripted driver conversations, assistant responses, a route context panel, action logs, parking results, road-alert outcomes, and browser speech synthesis for voice output.

## What was built during the hackathon window

ParkShare existed before the hackathon as a mobile parking and driving app. During the hackathon window, the project was significantly updated with a new Alexa+ MCP mobility copilot server, improved voice-first flows, safer route-start parking confirmation, stronger nearby-place search behavior, and road-alert concepts for driver safety.

The submitted repository includes the MCP server source code, setup instructions, smoke test, scripted demo flows, and companion UI used in the video. The mobile app is the product context behind the demo.

## Challenges we ran into

The main challenge was turning a real mobile driving workflow into a clear conversational tool interface. ParkShare includes maps, parking state, route context, user location, voice commands, and community alerts, but the hackathon submission needed to expose those workflows as Alexa+ MCP tools.

Another challenge was keeping the assistant answers safe for driving: short, actionable, and backed by structured tool results rather than long chat responses.

## Accomplishments

We created a focused Alexa+ MCP server around a real mobility product. The demo shows four core driver workflows: finding a nearby supermarket, finding destination parking, checking road alerts, and releasing a parking spot for the community.

We also prepared a clear submission structure, open-source license, README, smoke test, demo script, product feedback, and friction logs.

## What we learned

The strongest mobility assistant is not just a chatbot. It needs location context, route context, parking state, safety rules, and short answers that work while the user is driving.

The Alexa+ track pushed ParkShare toward a more agentic model: a driver should be able to ask one natural question and get one useful action without digging through screens.

## What's next

Next steps are to connect the MCP server more deeply to real ParkShare APIs, improve Android Auto behavior, strengthen voice-only workflows, add better confidence rules for road alerts and parking reports, and expand parking guidance around destination arrival.

## Product feedback

The Alexa+ track was useful because it made us think about ParkShare as an agent rather than only a mobile screen. The most valuable requirement was having to show a working interaction, not just describe an assistant. MCP is a strong fit because ParkShare actions map naturally to tools: search places, find parking, check alerts, confirm a previous spot, and release a free parking spot.

The main friction is that the distinction between a production Alexa+ integration, an Agent Skill, an MCP server, and a simulated Alexa+ experience needs to be extremely clear for builders. We chose the MCP server path as the primary implementation and kept the simulator only as a visual companion for the demo video.

Feature request: provide a small official starter template for Alexa+ MCP submissions, including Streamable HTTP setup, repo structure, authentication guidance, and a test client.

## Friction log 1

Task attempted: Understand which Amazon track fits an existing mobility app.

Expected: A general AI/mobile category where the app could be submitted directly.

Actual: The project must fit Fire TV, Alexa+, Bee or Ring.

Workaround: Choose Alexa+ and expose ParkShare actions through a real MCP server, with a web simulator only for visual explanation.

Severity: Medium.

Suggestion: Add a quick track-selection decision tree near the top of the hackathon page.

## Friction log 2

Task attempted: Prepare a submission while the Android app is still in Google Play review.

Expected: Submit the mobile app once the store version is live.

Actual: Review delays can block the strongest demo link.

Workaround: Prepare the Alexa+ MCP server, companion simulator, screenshots, text and video plan now, then attach the Play/test link when available.

Severity: Low.

Suggestion: Encourage teams with mobile apps to include both a web demo and store/test build instructions.

