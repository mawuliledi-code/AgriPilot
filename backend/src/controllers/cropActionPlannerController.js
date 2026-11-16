
const pool = require("../config/postgres");

const getWeather = require("../utils/weatherService");
const getWeatherRecommendations = require("../utils/weatherRecommendations");
const createCropActionPlan = require("../utils/cropActionPlanner");

const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// Convert PostgreSQL crop rows into the format used by existing utilities.
const formatCrop = (row) => ({
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
  farm: row.farm_id,
});

// Convert PostgreSQL observation rows into the existing utility format.
const formatObservation = (row) => ({
  _id: row.observation_id,
  observationType: row.observation_type,
  name: row.name,
  observationDate: row.observation_date,
  severity: row.severity,
  symptoms: row.symptoms,
  notes: row.notes,
  treatmentApplied: row.treatment_applied,
  status: row.status,
  farmer: row.farmer_id,
  crop: row.crop_id
    ? {
        _id: row.crop_id,
        name: row.crop_name,
      }
    : null,
});

// Convert PostgreSQL completion rows into the existing utility format.
const formatCompletion = (row) => ({
  _id: row.completion_id,
  farmer: row.farmer_id,
  farm: row.farm_id,
  crop: row.crop_id,
  observationId: row.observation_id,
  weatherEventId: row.weather_event_id,
  actionType: row.action_type,
  actionDescription: row.action_description,
  status: row.status,
  completedAt: row.completed_at,
  outcome: row.outcome,
  notes: row.notes,
});

const getCropActionPlan = async (req, res) => {
  try {
    const farmId = req.params.farmId;
    const userId = req.user.userId;

    if (!validId(farmId)) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    // Find the farm and confirm ownership.
    const farmResult = await pool.query(
      `SELECT farm_id, farm_name AS name, city, country, latitude, longitude
       FROM farms
       WHERE farm_id = $1 AND user_id = $2`,
      [Number(farmId), userId]
    );

    const farm = farmResult.rows[0];

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    // Confirm the farm has coordinates for weather information.
    if (
      !Number.isFinite(Number(farm.latitude)) ||
      !Number.isFinite(Number(farm.longitude)) ||
      farm.latitude === null ||
      farm.longitude === null
    ) {
      return res.status(400).json({
        message: "Add valid farm coordinates before requesting an action plan.",
      });
    }

    // Get crops belonging to this farm.
    const cropsResult = await pool.query(
      `SELECT *
       FROM crops
       WHERE farm_id = $1
       ORDER BY created_at DESC`,
      [farm.farm_id]
    );

    const crops = cropsResult.rows.map(formatCrop);
    const cropIds = crops.map((crop) => crop._id);

    // Get health observations belonging to these crops and this user.
    let observations = [];

    if (cropIds.length > 0) {
      const observationsResult = await pool.query(
        `SELECT o.*, c.crop_name
         FROM crop_health_observations o
         LEFT JOIN crops c ON c.crop_id = o.crop_id
         WHERE o.farmer_id = $1
           AND o.crop_id = ANY($2::integer[])`,
        [userId, cropIds]
      );

      observations = observationsResult.rows.map(formatObservation);
    }

    // Get completed actions belonging to this farmer and farm.
    const completedResult = await pool.query(
      `SELECT *
       FROM farmer_action_completions
       WHERE farmer_id = $1 AND farm_id = $2`,
      [userId, farm.farm_id]
    );

    const completedActions = completedResult.rows.map(formatCompletion);

    // Get current weather and weather-based recommendations.
    let weatherRecommendations = [];

    try {
      const weather = await getWeather(
        Number(farm.latitude),
        Number(farm.longitude)
      );

      weatherRecommendations = getWeatherRecommendations(
        weather,
        crops
      );
    } catch (weatherError) {
      console.error(
        "Weather unavailable. Continuing without weather recommendations:",
        weatherError.message
      );
    }

    // Generate the action plan using the existing recommendation utility.
    const actionPlan = createCropActionPlan(
      crops,
      observations,
      weatherRecommendations,
      completedActions
    );

    return res.status(200).json({
      message: "Crop action plan generated successfully.",
      farm: {
        id: farm.farm_id,
        name: farm.name,
        location: {
          city: farm.city,
          country: farm.country,
        },
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
