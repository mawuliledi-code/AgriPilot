
const getWeather = async (latitude, longitude) => {
  // Validate farm coordinates
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

  // Prepare Open-Meteo request
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

  // Retry temporary weather service errors
  const maxAttempts = 3;
  const retryDelays = [1000, 2000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Weather request attempt ${attempt}/${maxAttempts}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorDetails = await response.text();

        console.error("Open-Meteo API Error:", {
          status: response.status,
          details: errorDetails,
        });

        // Retry temporary server or rate-limit errors
        const temporaryErrors = [429, 500, 502, 503, 504];

        if (
          temporaryErrors.includes(response.status) &&
          attempt < maxAttempts
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          );

          continue;
        }

        throw new Error(
          `Weather service error (${response.status}): ${errorDetails}`
        );
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
          windSpeed: data.current_units.wind_speed,
        },
      };

    } catch (error) {
      console.error(
        `Weather request attempt ${attempt} failed:`,
        error.message
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      // Retry network errors and timeouts
      if (
        error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error.name === "TypeError"
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelays[attempt - 1])
        );

        continue;
      }

      // Do not retry other permanent errors
      throw error;
    }
  }

  throw new Error("Weather service is currently unavailable");
};

module.exports = getWeather;
