
const pool = require("../config/postgres");

const getWeather = require("../utils/weatherService");
const getWeatherRecommendations = require("../utils/weatherRecommendations");

const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// Get weather using the saved coordinates of the logged-in farmer's farm.
const getFarmWeather = async (req, res) => {
  try {
    const farmId = req.params.farmId;
    const userId = req.user.userId;

    if (!validId(farmId)) {
      return res.status(404).json({
        message: "Farm not found",
      });
    }

    const farmResult = await pool.query(
      `SELECT farm_id, farm_name, latitude, longitude,
              weather_cache, weather_fetched_at
       FROM farms
       WHERE farm_id = $1 AND user_id = $2`,
      [Number(farmId), userId]
    );

    const farm = farmResult.rows[0];

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found",
      });
    }

    if (
      !Number.isFinite(farm.latitude) ||
      !Number.isFinite(farm.longitude)
    ) {
      return res.status(400).json({
        message:
          "This farm does not have valid coordinates. Please update its latitude and longitude.",
      });
    }

    let weather;
    let weatherSource = "live";
    let weatherUpdatedAt;

    try {
      // Try retrieving fresh weather data.
      weather = await getWeather(
        farm.latitude,
        farm.longitude
      );

      weatherUpdatedAt = new Date();

      // Save the weather response in PostgreSQL.
      await pool.query(
        `UPDATE farms
         SET weather_cache = $1::jsonb,
             weather_fetched_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE farm_id = $3 AND user_id = $4`,
        [
          JSON.stringify(weather),
          weatherUpdatedAt,
          farm.farm_id,
          userId,
        ]
      );
    } catch (weatherError) {
      console.error(
        "Live weather unavailable:",
        weatherError.message
      );

      // Use previously saved weather if available.
      if (farm.weather_cache) {
        weather = farm.weather_cache;
        weatherUpdatedAt = farm.weather_fetched_at;
        weatherSource = "cache";
      } else {
        return res.status(503).json({
          message:
            "Live weather is temporarily unavailable and no previous weather data is saved yet.",
        });
      }
    }

    // Get crops belonging to this farm.
    const cropsResult = await pool.query(
      `SELECT crop_id, crop_name, crop_type, planting_date,
              expected_harvest_date, status, growing_period,
              common_pests, common_diseases, irrigation,
              fertilizer, pesticide, pests, diseases
       FROM crops
       WHERE farm_id = $1`,
      [farm.farm_id]
    );

    // Convert PostgreSQL crop rows into the format expected
    // by the existing weather recommendation utility.
    const crops = cropsResult.rows.map((row) => ({
      _id: row.crop_id,
      name: row.crop_name,
      type: row.crop_type,
      plantingDate: row.planting_date,
      expectedHarvestDate: row.expected_harvest_date,
      status: row.status,
      growingPeriod: row.growing_period || {},
      commonPests: row.common_pests || [],
      commonDiseases: row.common_diseases || [],
      irrigation: row.irrigation || {},
      fertilizer: row.fertilizer || {},
      pesticide: row.pesticide || {},
      pests: row.pests || [],
      diseases: row.diseases || [],
    }));

    // Generate weather-based recommendations.
    const recommendations = getWeatherRecommendations(
      weather,
      crops
    );

    const cropNames = [
      ...new Set(crops.map((crop) => crop.name)),
    ];

    return res.status(200).json({
      message: "Farm weather retrieved successfully",
      farm: farm.farm_name,
      crops: cropNames,
      weather,
      recommendations,
      weatherSource,
      weatherUpdatedAt,
    });
  } catch (error) {
    console.error("Farm weather error:", error);

    return res.status(500).json({
      message: "Unable to retrieve farm weather",
      error: error.message,
    });
  }
};

module.exports = {
  getFarmWeather,
};
