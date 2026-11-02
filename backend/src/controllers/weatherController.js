
const Farm = require("../models/Farm");
const Crop = require("../models/Crop");

const getWeather = require("../utils/weatherService");
const getWeatherRecommendations = require("../utils/weatherRecommendations");

// Get weather using the saved coordinates of the logged-in farmer's farm
const getFarmWeather = async (req, res) => {
  try {
    const farm = await Farm.findOne({
      _id: req.params.farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found",
      });
    }

    // Validate farm coordinates
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
      // Try retrieving fresh weather data
      weather = await getWeather(
        farm.latitude,
        farm.longitude
      );

      // Save successful weather response in MongoDB
      weatherUpdatedAt = new Date();

      farm.weatherCache = {
        data: weather,
        fetchedAt: weatherUpdatedAt,
      };

      await farm.save();

    } catch (weatherError) {
      console.error(
        "Live weather unavailable:",
        weatherError.message
      );

      // Use previously saved weather if available
      if (farm.weatherCache?.data) {
        weather = farm.weatherCache.data;
        weatherUpdatedAt = farm.weatherCache.fetchedAt;
        weatherSource = "cache";
      } else {
        return res.status(503).json({
          message:
            "Live weather is temporarily unavailable and no previous weather data is saved yet.",
        });
      }
    }

    // Get crops belonging to this farm
    const crops = await Crop.find({
      farm: farm._id,
    });

    // Generate weather-based recommendations
    const recommendations =
      getWeatherRecommendations(weather, crops);

    const cropNames = [
      ...new Set(crops.map((crop) => crop.name)),
    ];

    return res.status(200).json({
      message: "Farm weather retrieved successfully",
      farm: farm.name,
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
