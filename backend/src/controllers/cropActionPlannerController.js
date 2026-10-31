
const Farm = require("../models/Farm");
const Crop = require("../models/Crop");
const CropHealth = require("../models/CropHealth");
const ActionCompletion = require("../models/ActionCompletion");

const getWeather = require("../utils/weatherService");
const getWeatherRecommendations = require("../utils/weatherRecommendations");
const createCropActionPlan = require("../utils/cropActionPlanner");

const getCropActionPlan = async (req, res) => {
  try {
    // Find the farm and confirm it belongs to the logged-in user
    const farm = await Farm.findOne({
      _id: req.params.farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    // Confirm the farm has coordinates for weather information
    if (
      !Number.isFinite(farm.latitude) ||
      !Number.isFinite(farm.longitude)
    ) {
      return res.status(400).json({
        message: "Add valid farm coordinates before requesting an action plan.",
      });
    }

    // Get crops belonging to this farm
    const crops = await Crop.find({ farm: farm._id });

    // Get health observations for those crops and this user
    const cropIds = crops.map((crop) => crop._id);

    const observations = await CropHealth.find({
      farmer: req.user.userId,
      crop: { $in: cropIds },
    }).populate("crop", "name");

    const completedActions = await ActionCompletion.find({
  farmer: req.user.userId,
  farm: farm._id,
    });

    // Get current weather and weather-based recommendations
    const weather = await getWeather(
      farm.latitude,
      farm.longitude
    );

    const weatherRecommendations = getWeatherRecommendations(
      weather,
      crops
    );

    // Combine everything into one prioritized action plan
    const actionPlan = createCropActionPlan(
  crops,
  observations,
  weatherRecommendations,
  completedActions
    );

    return res.status(200).json({
      message: "Crop action plan generated successfully.",
      farm: {
        id: farm._id,
        name: farm.name,
        location: farm.location,
      },
      ...actionPlan,
    });
  } catch (error) {
    console.error("Crop action planner error:", error);

    return res.status(500).json({
      message: "Failed to generate crop action plan.",
    });
  }
};

module.exports = { getCropActionPlan };