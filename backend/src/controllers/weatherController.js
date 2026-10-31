
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

    // Read coordinates directly from the farm in MongoDB
    if (
      !Number.isFinite(farm.latitude) ||
      !Number.isFinite(farm.longitude)
    ) {
      return res.status(400).json({
        message:
          "This farm does not have valid coordinates. Please update its latitude and longitude.",
      });
    }

    const weather = await getWeather(
      farm.latitude,
      farm.longitude
    );

    const crops = await Crop.find({
      farm: farm._id,
    });

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