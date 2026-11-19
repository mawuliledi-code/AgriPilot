
const getWeather = async (latitude, longitude) => {
  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude)) ||
    Number(latitude) < -90 ||
    Number(latitude) > 90 ||
    Number(longitude) < -180 ||
    Number(longitude) > 180
  ) {
    throw new Error("Valid latitude and longitude are required");
  }

  const apiKey = process.env.WEATHERAPI_KEY;

  if (!apiKey) {
    throw new Error("WEATHERAPI_KEY is not configured");
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: `${Number(latitude)},${Number(longitude)}`,
    days: "3",
    aqi: "no",
    alerts: "no",
  });

  const url = `https://api.weatherapi.com/v1/forecast.json?${params}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("WeatherAPI error:", response.status, details);
      throw new Error(`Weather service error (${response.status})`);
    }

    const data = await response.json();

    const current = {
      time: data.current.last_updated,
      temperature_2m: data.current.temp_c,
      relative_humidity_2m: data.current.humidity,
      precipitation: data.current.precip_mm,
      weather_code: data.current.condition.code,
      wind_speed_10m: data.current.wind_kph,
      condition: data.current.condition.text,
    };

    const hourly = data.forecast.forecastday.flatMap((day) =>
      day.hour.map((hour) => ({
        time: hour.time,
        temperature_2m: hour.temp_c,
        precipitation_probability: hour.chance_of_rain,
        precipitation: hour.precip_mm,
        weather_code: hour.condition.code,
        condition: hour.condition.text,
      }))
    );

    const daily = data.forecast.forecastday.map((day) => ({
      time: day.date,
      weather_code: day.day.condition.code,
      temperature_2m_max: day.day.maxtemp_c,
      temperature_2m_min: day.day.mintemp_c,
      precipitation_sum: day.day.totalprecip_mm,
      precipitation_probability_max: day.day.daily_chance_of_rain,
      condition: day.day.condition.text,
    }));

    return {
      location: {
        latitude: data.location.lat,
        longitude: data.location.lon,
        timezone: data.location.tz_id,
        name: data.location.name,
        country: data.location.country,
      },
      current,
      hourly,
      daily,
      units: {
        temperature: "°C",
        humidity: "%",
        precipitation: "mm",
        windSpeed: "km/h",
      },
    };
  } catch (error) {
    console.error("Weather service failed:", error.message);
    throw error;
  }
};

module.exports = getWeather;
