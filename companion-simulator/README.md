# ParkShare Alexa+ Driving Copilot Simulator

This is a static web demo prepared for the Build, Ship, Shape: Amazon Developer Hackathon.

It demonstrates a simulated Alexa+ experience for ParkShare. It is not a production Alexa+ integration. The goal is to show how ParkShare could work as a conversational mobility copilot for parking, nearby places, route alerts, and collaborative spot sharing.

## Run locally

Open `index.html` in a browser.

No install step is required.

## Demo flow

Use the scenario buttons in this order:

1. Find supermarket
2. Find parking
3. Road alerts
4. Release spot

Each button sends a driver request and shows the simulated ParkShare assistant response, action log, route context, and parking result.

The "Play assistant voice" button uses browser speech synthesis when available.

## Hackathon track

Primary track: Alexa+

Submission wording:

This project uses the Alexa+ simulated-experience path described in the hackathon requirements. It is a web app simulation of a ParkShare Alexa+ mobility copilot, with source code included in the repository and a demo video showing the interaction working.

## What the demo shows

- Current-location search outside a major city.
- Parking-aware destination guidance.
- Previous parking spot release confirmation before a new route.
- Community road alerts and alternate-route reasoning.
- Voice-style assistant response output.

## What was built during the hackathon window

ParkShare existed before the hackathon as a mobile parking and driving app. During the hackathon window, the project was significantly updated with a new simulated Alexa+ mobility copilot experience, improved voice-first flows, safer route-start parking confirmation, stronger nearby-place search behavior, and road-alert concepts for driver safety.

## Files

- `index.html`: demo shell.
- `styles.css`: UI styling.
- `app.js`: scripted assistant scenarios and state updates.

