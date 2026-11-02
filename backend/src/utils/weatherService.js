
const getWeather = async (latitude, longitude) => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Valid latitude and longitude are required");
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),

    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",

    hourly:
      "temperature_2m,precipitation_probability,precipitation",

    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",

    forecast_days: "7",
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service is currently unavailable");
  }

  const data = await response.json();

  return {
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    },

    current: data.current,
    hourly: data.hourly,
    daily: data.daily,

    units: {
      temperature: data.current_units.temperature_2m,
      humidity: data.current_units.relative_humidity_2m,
      precipitation: data.current_units.precipitation,
      windSpeed: data.current_units.wind_speed_10m,
    },
  };
};

module.exports = getWeather;
