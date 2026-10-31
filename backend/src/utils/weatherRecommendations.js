
const getCropGrowthStage = require("./cropGrowthStage");

const FARM_TIME_ZONE = "Africa/Accra";
const HOUR_MS = 60 * 60 * 1000;

// Parse a weather timestamp returned without a timezone.
// Open-Meteo timestamps for this farm use Accra local time.
// Accra is UTC+00:00, so the conversion is explicit.
const parseWeatherTime = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const text = String(value).trim();

  // Handle timestamps that already contain a timezone.
  if (/Z$|[+-]\d{2}:\d{2}$/.test(text)) {
    const timestamp = Date.parse(text);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  // Accra is UTC+00:00. Explicitly append Z instead of
  // letting Node.js interpret the value in its own timezone.
  const timestamp = Date.parse(`${text}Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const toEventTimeId = (value) => {
  const timestamp = parseWeatherTime(value);
  return timestamp === null
    ? null
    : new Date(timestamp).toISOString();
};

const getWeatherRecommendations = (weather, crops = []) => {
  const recommendations = [];
  const current = weather?.current;
  const hourly = weather?.hourly;

  if (!current || !hourly) {
    throw new Error("Valid weather data is required");
  }

const currentTimestamp = parseWeatherTime(current.time);

const currentTimeId =
  currentTimestamp === null
    ? null
    : new Date(currentTimestamp).toISOString().slice(0, 10);

  const hasTomatoes = crops.some(
    (crop) =>
      typeof crop.name === "string" &&
      crop.name.toLowerCase() === "tomatoes"
  );

  // 1. Current heat conditions.
  let heatSeverity = null;

  if (current.temperature_2m >= 35) {
    heatSeverity = "high";
  } else if (current.temperature_2m >= 30) {
    heatSeverity = "medium";
  }

  if (heatSeverity) {
    // Both heat recommendations share the same event ID.
    // The planner can merge them into one action.
    const heatEventId = currentTimeId
      ? `heat:${currentTimeId}`
      : null;

    if (hasTomatoes) {
      recommendations.push({
        type: "tomato_heat_care",
        ...(heatEventId && { weatherEventId: heatEventId }),
        severity: "medium",
        message:
          "Hot conditions may increase water stress in tomato plants.",
        action:
          "Check soil moisture around tomato plants and inspect leaves for wilting. Water if needed and avoid waterlogging.",
      });
    }

    recommendations.push({
      type: "heat_risk",
      ...(heatEventId && { weatherEventId: heatEventId }),
      severity: heatSeverity,
      message:
        current.temperature_2m >= 35
          ? "Very high temperatures detected. Check crops for heat stress and inspect soil moisture."
          : "High temperatures may increase crop water demand.",
      action:
        current.temperature_2m >= 35
          ? "Inspect crops during cooler hours and consider irrigation if the soil is dry."
          : "Monitor soil moisture and check crops for signs of wilting.",
    });
  }

  // 2. Crop growth and harvest recommendations.
  for (const crop of crops) {
    const growth = getCropGrowthStage(crop);

    if (growth.stage === "potentially_ready") {
      recommendations.push({
        type: "harvest_check",
        severity: "medium",
        crop: crop.name,
        cropId: crop._id,
        message:
          `${crop.name} has reached its minimum catalog growing period.`,
        action:
          "Inspect the crop and confirm maturity before harvesting.",
        daysSincePlanting: growth.daysSincePlanting,
      });
    }

    if (crop.expectedHarvestDate && crop.status !== "harvested") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const harvestDate = new Date(crop.expectedHarvestDate);
      harvestDate.setHours(0, 0, 0, 0);

      const daysUntilHarvest = Math.ceil(
        (harvestDate.getTime() - today.getTime()) /
          (24 * HOUR_MS)
      );

      if (daysUntilHarvest >= 0 && daysUntilHarvest <= 7) {
        recommendations.push({
          type: "harvest_approaching",
          severity: "medium",
          crop: crop.name,
          cropId: crop._id,
          message:
            `${crop.name} is expected to be ready for harvest in ${daysUntilHarvest} day(s).`,
          action:
            "Inspect the crop for maturity, prepare harvesting materials, and plan storage or transport.",
          daysUntilHarvest,
        });
      }
    }
  }

  // 3. Heavy current precipitation.
  if (
    Number.isFinite(current.precipitation) &&
    current.precipitation >= 10
  ) {
    recommendations.push({
      type: "heavy_rain",
      ...(currentTimeId && {
        weatherEventId: `heavy_rain:${currentTimeId}`,
      }),
      severity: "high",
      message: "Significant precipitation is being recorded.",
      action:
        "Check field drainage and watch for waterlogging around crops.",
    });
  }

  // 4. Find the highest rain probability in the next six hours.
  const forecastTimes = hourly.time || [];
  const probabilities = hourly.precipitation_probability || [];

  if (currentTimestamp !== null) {
    const sixHoursLater = currentTimestamp + 6 * HOUR_MS;

    const nextSixHours = probabilities
      .map((probability, index) => ({
        probability,
        time: forecastTimes[index],
        timestamp: parseWeatherTime(forecastTimes[index]),
      }))
      .filter(
        (item) =>
          item.timestamp !== null &&
          item.timestamp >= currentTimestamp &&
          item.timestamp <= sixHoursLater &&
          Number.isFinite(item.probability)
      );

    const highestRainProbability = nextSixHours.reduce(
      (highest, item) =>
        !highest || item.probability > highest.probability
          ? item
          : highest,
      null
    );

    if (
      highestRainProbability &&
      highestRainProbability.probability >= 70
    ) {
      const forecastTimeId = toEventTimeId(
        highestRainProbability.time
      );

      recommendations.push({
        type: "rain_forecast",
        ...(forecastTimeId && {
          weatherEventId: `rain_forecast:${forecastTimeId}`,
        }),
        severity: "medium",
        message:
          "There is a high probability of rain within the next six hours.",
        action:
          "Check the soil before irrigating and adjust planned watering if rain is sufficient.",
        forecastTime: highestRainProbability.time,
        precipitationProbability:
          highestRainProbability.probability,
      });
    }
  }

  // 5. Default recommendation if no rules were triggered.
// Use the Accra calendar date so the task has a stable daily identity.
if (recommendations.length === 0) {
  const accraDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: FARM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  recommendations.push({
    type: "general_monitoring",
    weatherEventId: `general_monitoring:all-crops:${accraDate}`,
    severity: "low",
    message:
      "No major weather warning was detected by the current rules.",
    action:
      "Continue monitoring your crops and check soil moisture regularly.",
  });
}
  return recommendations;
};

module.exports = getWeatherRecommendations;

