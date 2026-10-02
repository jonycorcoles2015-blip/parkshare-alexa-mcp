const scenarios = {
  supermarket: {
    driver: "Alexa, ask ParkShare to find a supermarket from the Montblanc demo location.",
    answer:
      "Using the Montblanc demo location, the best supermarket is Mercadona in Montblanc, about 5.2 kilometers away. I found three parking leads nearby and the fastest route takes around seven minutes.",
    title: "Nearest supermarket found",
    subtitle: "Mercadona, Montblanc",
    eta: "7 min",
    place: "Mercadona",
    distance: "5.2 km",
    parking: "3",
    alerts: "1",
    safetyTitle: "Demo-location search",
    safetyCopy: "The demo uses a fixed Montblanc camping location so judges can replay the same scenario.",
    log: [
      "Use fixed demo driver location near Montblanc",
      "Expanded nearby-place search beyond the current town",
      "Ranked supermarket results by practical driving distance",
      "Checked parking leads around the destination"
    ],
    results: [
      ["Mercadona Montblanc", "5.2 km away, best match"],
      ["Free street parking lead", "230 meters from destination"],
      ["Community parking lead", "Confirmed recently by ParkShare users"]
    ]
  },
  parking: {
    driver: "Alexa, ask ParkShare to guide me to the closest available parking near my destination.",
    answer:
      "I found a likely free parking area 230 meters from your destination. Before I start the new route, did you leave your previous parking spot free?",
    title: "Parking-aware route",
    subtitle: "Destination parking zone",
    eta: "9 min",
    place: "Destination",
    distance: "230 m",
    parking: "4",
    alerts: "0",
    safetyTitle: "Route-start confirmation",
    safetyCopy: "Before navigating, ParkShare asks if the previous parking spot was left free.",
    log: [
      "Loaded destination context",
      "Checked active parking stock",
      "Selected closest practical parking lead",
      "Triggered previous-spot release confirmation"
    ],
    results: [
      ["Closest parking lead", "230 meters from destination"],
      ["Second option", "410 meters, easier exit route"],
      ["Question required", "Did the driver leave the previous spot free?"]
    ]
  },
  alerts: {
    driver: "Alexa, ask ParkShare if there are road alerts on my route.",
    answer:
      "There is one community alert on your route: a mobile control reported near the town entrance. The alternative route is five minutes slower but avoids the alert area.",
    title: "Road alerts checked",
    subtitle: "Primary and alternate route",
    eta: "+5 min",
    place: "Alt route",
    distance: "12.4 km",
    parking: "2",
    alerts: "1",
    safetyTitle: "Safer route choice",
    safetyCopy: "The assistant explains the alert and offers a slower alternate route when useful.",
    log: [
      "Read current route",
      "Checked active community road alerts",
      "Compared primary and alternate route",
      "Prepared safer-route recommendation"
    ],
    results: [
      ["Mobile control", "Reported near town entrance"],
      ["Primary route", "Fastest route, one alert"],
      ["Alternate route", "Five minutes slower, avoids alert area"]
    ]
  },
  release: {
    driver: "Alexa, tell ParkShare I left my parking spot free.",
    answer:
      "Done. I marked your previous parking spot as free and available for nearby drivers. I will keep it visible for a short time unless another user confirms it is occupied.",
    title: "Parking spot released",
    subtitle: "Collaborative parking update",
    eta: "Now",
    place: "Free spot",
    distance: "0 m",
    parking: "+1",
    alerts: "0",
    safetyTitle: "Collaborative parking",
    safetyCopy: "A confirmed free spot becomes visible for nearby drivers with expiry rules.",
    log: [
      "Confirmed driver intent",
      "Released previous parking coordinates",
      "Published temporary free-spot signal",
      "Started expiry and confidence rules"
    ],
    results: [
      ["Spot status", "Free"],
      ["Confidence", "Fresh driver confirmation"],
      ["Visibility", "Shown to nearby ParkShare users"]
    ]
  }
};

const conversation = document.querySelector("#conversation");
const assistantAnswer = document.querySelector("#assistantAnswer");
const actionLog = document.querySelector("#actionLog");
const resultList = document.querySelector("#resultList");
const commandInput = document.querySelector("#commandInput");

const mapTitle = document.querySelector("#mapTitle");
const mapSubtitle = document.querySelector("#mapSubtitle");
const etaValue = document.querySelector("#etaValue");
const placePin = document.querySelector("#placePin");
const distanceMetric = document.querySelector("#distanceMetric");
const parkingMetric = document.querySelector("#parkingMetric");
const alertMetric = document.querySelector("#alertMetric");
const safetyTitle = document.querySelector("#safetyTitle");
const safetyCopy = document.querySelector("#safetyCopy");

function addMessage(type, text) {
  const item = document.createElement("div");
  item.className = `message ${type}`;
  item.textContent = text;
  conversation.appendChild(item);
  conversation.scrollTop = conversation.scrollHeight;
}

function renderList(target, items, createItem) {
  target.replaceChildren();
  items.forEach((item) => target.appendChild(createItem(item)));
}

function setScenario(scenario) {
  addMessage("driver", scenario.driver);
  addMessage("assistant", scenario.answer);

  assistantAnswer.textContent = scenario.answer;
  mapTitle.textContent = scenario.title;
  mapSubtitle.textContent = scenario.subtitle;
  etaValue.textContent = scenario.eta;
  placePin.textContent = scenario.place;
  distanceMetric.textContent = scenario.distance;
  parkingMetric.textContent = scenario.parking;
  alertMetric.textContent = scenario.alerts;
  safetyTitle.textContent = scenario.safetyTitle;
  safetyCopy.textContent = scenario.safetyCopy;

  renderList(actionLog, scenario.log, (text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  });

  renderList(resultList, scenario.results, ([title, detail]) => {
    const item = document.createElement("div");
    item.className = "result-item";

    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = detail;

    item.append(strong, span);
    return item;
  });
}

function inferScenarioFromText(text) {
  const value = text.toLowerCase();
  if (value.includes("alert") || value.includes("camera") || value.includes("control")) {
    return scenarios.alerts;
  }
  if (value.includes("free") || value.includes("release") || value.includes("left my parking")) {
    return scenarios.release;
  }
  if (value.includes("parking") || value.includes("park")) {
    return scenarios.parking;
  }
  return scenarios.supermarket;
}

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => {
    setScenario(scenarios[button.dataset.scenario]);
  });
});

document.querySelector("#sendCommand").addEventListener("click", () => {
  const text = commandInput.value.trim();
  if (!text) return;

  const scenario = inferScenarioFromText(text);
  setScenario({ ...scenario, driver: text });
});

document.querySelector("#speakAnswer").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(assistantAnswer.textContent);
  utterance.lang = "en-US";
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
});

setScenario(scenarios.supermarket);

