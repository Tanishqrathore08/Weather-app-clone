const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const statusEl = document.querySelector("#status");
const currentSection = document.querySelector("#current");
const forecastSection = document.querySelector("#forecast");
const forecastGrid = document.querySelector("#forecast-grid");

const currentCity = document.querySelector("#current-city");
const currentDescription = document.querySelector("#current-description");
const currentTemp = document.querySelector("#current-temp");
const tempRange = document.querySelector("#temp-range");

const weekdays = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const weatherDescriptions = new Map([
  [0, "Clear sky"],
  [1, "Mainly clear"],
  [2, "Partly cloudy"],
  [3, "Overcast"],
  [45, "Foggy"],
  [48, "Depositing rime fog"],
  [51, "Light drizzle"],
  [53, "Moderate drizzle"],
  [55, "Dense drizzle"],
  [56, "Freezing drizzle"],
  [57, "Freezing dense drizzle"],
  [61, "Slight rain"],
  [63, "Moderate rain"],
  [65, "Heavy rain"],
  [66, "Freezing rain"],
  [67, "Freezing heavy rain"],
  [71, "Slight snow fall"],
  [73, "Moderate snow fall"],
  [75, "Heavy snow fall"],
  [77, "Snow grains"],
  [80, "Slight rain showers"],
  [81, "Moderate rain showers"],
  [82, "Violent rain showers"],
  [85, "Slight snow showers"],
  [86, "Heavy snow showers"],
  [95, "Thunderstorm"],
  [96, "Thunderstorm with hail"],
  [99, "Thunderstorm with heavy hail"],
]);

const weatherIcons = [
  { codes: [0], icon: "☀️" },
  { codes: [1, 2], icon: "🌤️" },
  { codes: [3], icon: "☁️" },
  { codes: [45, 48], icon: "🌫️" },
  { codes: [51, 53, 55], icon: "🌦️" },
  { codes: [61, 63, 65, 80, 81, 82], icon: "🌧️" },
  { codes: [66, 67], icon: "🌨️" },
  { codes: [71, 73, 75, 77, 85, 86], icon: "❄️" },
  { codes: [95, 96, 99], icon: "⛈️" },
];

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput?.value.trim();
  if (!city) {
    setStatus("Please enter a city.");
    return;
  }

  setStatus("Looking up location…");

  try {
    const location = await fetchLocation(city);
    setStatus("Fetching forecast…");
    const weather = await fetchForecast(location.latitude, location.longitude);
    renderCurrent(location, weather);
    renderForecast(weather);
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Something went wrong.");
    currentSection.classList.add("hidden");
    forecastSection.classList.add("hidden");
  }
});

function setStatus(message) {
  statusEl.textContent = message;
}

async function fetchLocation(city) {
  const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
  endpoint.searchParams.set("name", city);
  endpoint.searchParams.set("count", "1");

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("Could not reach location service.");
  }
  const data = await response.json();
  if (!data?.results?.length) {
    throw new Error("City not found. Try another query.");
  }
  return data.results[0];
}

async function fetchForecast(latitude, longitude) {
  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", latitude);
  endpoint.searchParams.set("longitude", longitude);
  endpoint.searchParams.set(
    "daily",
    [
      "weathercode",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_mean",
    ].join(",")
  );
  endpoint.searchParams.set("current_weather", "true");
  endpoint.searchParams.set("timezone", "auto");
  endpoint.searchParams.set("forecast_days", "7");

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("Could not fetch forecast data.");
  }
  const data = await response.json();
  if (!data?.daily || !data?.current_weather) {
    throw new Error("Incomplete weather data received.");
  }
  return data;
}

function renderCurrent(location, weather) {
  const code = Number(weather.current_weather.weathercode);
  currentCity.textContent = `${location.name}, ${location.country_code}`;
  currentDescription.textContent = weatherDescriptions.get(code) || "—";
  currentTemp.textContent = `${Math.round(weather.current_weather.temperature)}°`;
  tempRange.textContent = `H ${Math.round(
    weather.daily.temperature_2m_max[0]
  )}° · L ${Math.round(weather.daily.temperature_2m_min[0])}°`;

  currentSection.classList.remove("hidden");
}

function renderForecast(weather) {
  forecastGrid.innerHTML = "";
  const template = document.querySelector("#forecast-card-template");

  weather.daily.time.forEach((day, index) => {
    const clone = template.content.cloneNode(true);
    const code = Number(weather.daily.weathercode[index]);

    clone.querySelector(".forecast-day").textContent = formatDay(day, index);
    clone.querySelector(".forecast-icon").textContent = getIcon(code);
    clone.querySelector(".forecast-high").textContent = `High: ${Math.round(
      weather.daily.temperature_2m_max[index]
    )}°`;
    clone.querySelector(".forecast-low").textContent = `Low: ${Math.round(
      weather.daily.temperature_2m_min[index]
    )}°`;
    clone.querySelector(
      ".forecast-precip"
    ).textContent = `Precip: ${Math.round(
      weather.daily.precipitation_probability_mean[index] ?? 0
    )}%`;

    forecastGrid.appendChild(clone);
  });

  forecastSection.classList.remove("hidden");
}

function formatDay(dateString, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return weekdays.format(new Date(dateString));
}

function getIcon(code) {
  const match = weatherIcons.find((entry) => entry.codes.includes(code));
  return match ? match.icon : "ℹ️";
}

