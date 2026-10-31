
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
      "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    hourly:
      "temperature_2m,precipitation_probability,precipitation",
    forecast_days: "2",
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
    units: {
      temperature: data.current_units.temperature_2m,
      humidity: data.current_units.relative_humidity_2m,
      precipitation: data.current_units.precipitation,
    },
  };
};

module.exports = getWeather;

