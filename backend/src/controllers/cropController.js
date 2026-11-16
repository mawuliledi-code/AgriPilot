
const pool = require("../config/postgres");
const cropCatalog = require("../data/cropCatalog");

// Convert a PostgreSQL crop row into the existing API response format.
const formatCrop = (row) => ({
  _id: row.crop_id,
  name: row.crop_name,
  type: row.crop_type,
  growingPeriod: row.growing_period || {},
  commonPests: row.common_pests || [],
  commonDiseases: row.common_diseases || [],
  plantingDate: row.planting_date,
  expectedHarvestDate: row.expected_harvest_date,
  status: row.status,
  farm: row.farm_name
    ? {
        _id: row.farm_id,
        name: row.farm_name,
        location: {
          city: row.city,
          country: row.country
        }
      }
    : row.farm_id,
  irrigation: row.irrigation || {},
  fertilizer: row.fertilizer || {},
  pesticide: row.pesticide || {},
  pests: row.pests || [],
  diseases: row.diseases || [],
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const getOwnedCrop = async (cropId, userId) => {
  const result = await pool.query(
    `SELECT c.*, f.farm_name AS farm_name,
            f.city, f.country
     FROM crops c
     JOIN farms f ON f.farm_id = c.farm_id
     WHERE c.crop_id = $1 AND f.user_id = $2`,
    [cropId, userId]
  );

  return result.rows[0] || null;
};

const validId = (id) => /^\d+$/.test(String(id));

// Create a new crop
const createCrop = async (req, res) => {
  try {
    const {
      name,
      plantingDate,
      expectedHarvestDate,
      status,
      farm,
      irrigation,
      fertilizer,
      pesticide,
      pests,
      diseases,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Crop name is required"
      });
    }

    const cropKey = name.trim().toLowerCase();
    const cropInfo = cropCatalog[cropKey];

    if (!cropInfo) {
      return res.status(400).json({
        message: "Crop is not available in the AgriPilot crop catalog"
      });
    }

    if (!farm || !validId(farm)) {
      return res.status(400).json({
        message: "A valid farm ID is required"
      });
    }

    if (!plantingDate || Number.isNaN(new Date(plantingDate).getTime())) {
      return res.status(400).json({
        message: "A valid planting date is required"
      });
    }

    if (status !== undefined &&
        !["planned", "growing", "ready", "harvested"].includes(status)) {
      return res.status(400).json({
        message: "Invalid crop status",
        allowedStatuses: ["planned", "growing", "ready", "harvested"]
      });
    }

    const farmResult = await pool.query(
      `SELECT farm_id FROM farms
       WHERE farm_id = $1 AND user_id = $2`,
      [farm, req.user.userId]
    );

    if (farmResult.rows.length === 0) {
      const exists = await pool.query(
        "SELECT farm_id FROM farms WHERE farm_id = $1",
        [farm]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to add a crop to this farm"
          : "Farm not found"
      });
    }

    const result = await pool.query(
      `INSERT INTO crops (
        farm_id, crop_name, crop_type, growing_period,
        common_pests, common_diseases, planting_date,
        expected_harvest_date, status, irrigation,
        fertilizer, pesticide, pests, diseases, notes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *`,
      [
        farm,
        cropInfo.name,
        cropInfo.type,
        JSON.stringify(cropInfo.growingPeriod),
        JSON.stringify(cropInfo.commonPests || []),
        JSON.stringify(cropInfo.commonDiseases || []),
        plantingDate,
        expectedHarvestDate || null,
        status || "planned",
        JSON.stringify(irrigation || {}),
        JSON.stringify(fertilizer || {}),
        JSON.stringify(pesticide || {}),
        JSON.stringify(pests || []),
        JSON.stringify(diseases || []),
        notes || null
      ]
    );

    return res.status(201).json({
      message: "Crop created successfully",
      crop: formatCrop(result.rows[0])
    });
  } catch (error) {
    console.error("Error creating crop:", error.message);
    return res.status(500).json({
      message: "Error creating crop",
      error: error.message
    });
  }
};

// Get all crops belonging to the logged-in farmer
const getMyCrops = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, f.farm_name AS farm_name, f.city, f.country
       FROM crops c
       JOIN farms f ON f.farm_id = c.farm_id
       WHERE f.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    const crops = result.rows.map(formatCrop);

    return res.status(200).json({
      message: "Crops retrieved successfully",
      count: crops.length,
      crops
    });
  } catch (error) {
    console.error("Error retrieving crops:", error.message);
    return res.status(500).json({
      message: "Error retrieving crops",
      error: error.message
    });
  }
};

// Update a crop
const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to update this crop"
          : "Crop not found"
      });
    }

    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "planned", "growing", "ready", "harvested"
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid crop status",
          allowedStatuses
        });
      }

      const proposedPlantingDate =
        req.body.plantingDate !== undefined
          ? req.body.plantingDate
          : crop.planting_date;

      const plantingDate = proposedPlantingDate
        ? new Date(proposedPlantingDate)
        : null;

      if (proposedPlantingDate &&
          Number.isNaN(plantingDate.getTime())) {
        return res.status(400).json({
          message: "Invalid planting date"
        });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (
        ["growing", "ready", "harvested"].includes(req.body.status) &&
        (!plantingDate || plantingDate > today)
      ) {
        return res.status(400).json({
          message:
            "A crop must have a planting date that is today or earlier before it can be marked as growing, ready, or harvested."
        });
      }
    }

    const fields = {
      plantingDate: ["planting_date", false],
      expectedHarvestDate: ["expected_harvest_date", false],
      status: ["status", false],
      irrigation: ["irrigation", true],
      fertilizer: ["fertilizer", true],
      pesticide: ["pesticide", true],
      pests: ["pests", true],
      diseases: ["diseases", true],
      notes: ["notes", false]
    };

    const updates = [];
    const values = [];
    let index = 1;

    for (const [field, [column, isJson]] of Object.entries(fields)) {
      if (req.body[field] !== undefined) {
        values.push(
          isJson ? JSON.stringify(req.body[field]) : req.body[field]
        );
        updates.push(
          `${column} = $${index}${isJson ? "::jsonb" : ""}`
        );
        index++;
      }
    }

    if (updates.length === 0) {
      return res.status(200).json({
        message: "Crop updated successfully",
        crop: formatCrop(crop)
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE crops
       SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE crop_id = $${index}
       RETURNING *`,
      values
    );

    const updatedCrop = {
      ...result.rows[0],
      farm_name: crop.farm_name,
      city: crop.city,
      country: crop.country
    };

    return res.status(200).json({
      message: "Crop updated successfully",
      crop: formatCrop(updatedCrop)
    });
  } catch (error) {
    console.error("Error updating crop:", error.message);
    return res.status(500).json({
      message: "Error updating crop",
      error: error.message
    });
  }
};

// Delete a crop
const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to delete this crop"
          : "Crop not found"
      });
    }

    await pool.query(
      "DELETE FROM crops WHERE crop_id = $1",
      [id]
    );

    return res.status(200).json({
      message: "Crop deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting crop:", error.message);
    return res.status(500).json({
      message: "Error deleting crop",
      error: error.message
    });
  }
};

// Predict the harvest window
const predictHarvest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to view this crop"
          : "Crop not found"
      });
    }

    const minimumDays = crop.growing_period?.minimumDays;
    const maximumDays = crop.growing_period?.maximumDays;

    if (
      !crop.planting_date ||
      typeof minimumDays !== "number" ||
      typeof maximumDays !== "number"
    ) {
      return res.status(400).json({
        message: "Planting date or growing period is missing"
      });
    }

    const earliestHarvest = new Date(crop.planting_date);
    earliestHarvest.setUTCDate(
      earliestHarvest.getUTCDate() + minimumDays
    );

    const latestHarvest = new Date(crop.planting_date);
    latestHarvest.setUTCDate(
      latestHarvest.getUTCDate() + maximumDays
    );

    return res.status(200).json({
      message: "Harvest prediction generated successfully",
      crop: crop.crop_name,
      plantingDate: crop.planting_date,
      growingPeriod: { minimumDays, maximumDays },
      estimatedHarvestWindow: {
        earliest: earliestHarvest.toISOString().slice(0, 10),
        latest: latestHarvest.toISOString().slice(0, 10)
      },
      note: "This is an estimate. Actual harvest timing depends on crop variety, weather, and growing conditions."
    });
  } catch (error) {
    console.error("Error predicting harvest:", error.message);
    return res.status(500).json({
      message: "Error predicting harvest",
      error: error.message
    });
  }
};

// Get a watering reminder
const getWateringReminder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to view this crop"
          : "Crop not found"
      });
    }

    const irrigation = crop.irrigation || {};

    if (!irrigation.nextWatering) {
      return res.status(200).json({
        message: "No watering schedule available for this crop",
        crop: crop.crop_name,
        nextWatering: null,
        reminder: "Please add a watering schedule for this crop."
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const wateringDate = new Date(irrigation.nextWatering);
    wateringDate.setUTCHours(0, 0, 0, 0);

    let reminder;

    if (wateringDate < today) {
      reminder =
        "Watering may be overdue. Check soil moisture and weather conditions.";
    } else if (wateringDate.getTime() === today.getTime()) {
      reminder =
        "Watering is scheduled for today. Check soil moisture before watering.";
    } else {
      reminder = "Watering is scheduled for a future date.";
    }

    return res.status(200).json({
      message: "Watering reminder retrieved successfully",
      crop: crop.crop_name,
      wateringFrequency: irrigation.frequency || null,
      lastWatered: irrigation.lastWatered || null,
      nextWatering: irrigation.nextWatering,
      reminder
    });
  } catch (error) {
    console.error("Error retrieving watering reminder:", error.message);
    return res.status(500).json({
      message: "Error retrieving watering reminder",
      error: error.message
    });
  }
};

// Add a care activity
const addCareActivity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to update this crop"
          : "Crop not found"
      });
    }

    const {
      activityType,
      date,
      description,
      product,
      quantity,
      notes
    } = req.body;

    const allowedTypes = [
      "watering", "fertilizing", "pesticide",
      "inspection", "weeding", "other"
    ];

    if (!activityType || !description) {
      return res.status(400).json({
        message: "Activity type and description are required"
      });
    }

    if (!allowedTypes.includes(activityType)) {
      return res.status(400).json({
        message: "Invalid activity type",
        allowedTypes
      });
    }

    const result = await pool.query(
      `INSERT INTO care_activities (
        crop_id, activity_type, activity_date,
        description, product, quantity, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        activityType,
        date || new Date(),
        description.trim(),
        product || null,
        quantity || null,
        notes || null
      ]
    );

    const historyResult = await pool.query(
      `SELECT * FROM care_activities
       WHERE crop_id = $1
       ORDER BY activity_date DESC, activity_id DESC`,
      [id]
    );

    return res.status(201).json({
      message: "Care activity added successfully",
      careHistory: historyResult.rows.map((activity) => ({
        _id: activity.activity_id,
        activityType: activity.activity_type,
        date: activity.activity_date,
        description: activity.description,
        product: activity.product,
        quantity: activity.quantity,
        notes: activity.notes
      }))
    });
  } catch (error) {
    console.error("Error adding care activity:", error.message);
    return res.status(500).json({
      message: "Error adding care activity",
      error: error.message
    });
  }
};

// Get a crop's care history
const getCareHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to view this crop"
          : "Crop not found"
      });
    }

    const result = await pool.query(
      `SELECT * FROM care_activities
       WHERE crop_id = $1
       ORDER BY activity_date DESC, activity_id DESC`,
      [id]
    );

    const careHistory = result.rows.map((activity) => ({
      _id: activity.activity_id,
      activityType: activity.activity_type,
      date: activity.activity_date,
      description: activity.description,
      product: activity.product,
      quantity: activity.quantity,
      notes: activity.notes
    }));

    return res.status(200).json({
      message: "Care history retrieved successfully",
      crop: crop.crop_name,
      count: careHistory.length,
      careHistory
    });
  } catch (error) {
    console.error("Error retrieving care history:", error.message);
    return res.status(500).json({
      message: "Error retrieving care history",
      error: error.message
    });
  }
};

// Get crop monitoring information
const getCropMonitoring = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(404).json({ message: "Crop not found" });
    }

    const crop = await getOwnedCrop(id, req.user.userId);

    if (!crop) {
      const exists = await pool.query(
        "SELECT crop_id FROM crops WHERE crop_id = $1",
        [id]
      );

      return res.status(exists.rows.length ? 403 : 404).json({
        message: exists.rows.length
          ? "You are not authorized to view this crop"
          : "Crop not found"
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const plantingDate = crop.planting_date
      ? new Date(crop.planting_date)
      : null;

    if (plantingDate) plantingDate.setUTCHours(0, 0, 0, 0);

    const harvestDate = crop.expected_harvest_date
      ? new Date(crop.expected_harvest_date)
      : null;

    if (harvestDate) harvestDate.setUTCHours(0, 0, 0, 0);

    const totalGrowingDays =
      plantingDate && harvestDate
        ? Math.round((harvestDate - plantingDate) / 86400000)
        : null;

    const elapsedDays = plantingDate
      ? Math.max(0, Math.floor((today - plantingDate) / 86400000))
      : null;

    let progressPercentage = null;

    if (totalGrowingDays !== null && totalGrowingDays > 0) {
      progressPercentage = Math.min(
        100,
        Math.round((elapsedDays / totalGrowingDays) * 100)
      );
    }

    const daysUntilHarvest = harvestDate
      ? Math.ceil((harvestDate - today) / 86400000)
      : null;

    let harvestTiming = "date_not_set";

    if (harvestDate) {
      if (daysUntilHarvest < 0) {
        harvestTiming = "overdue";
      } else if (daysUntilHarvest === 0) {
        harvestTiming = "expected_today";
      } else if (daysUntilHarvest <= 7) {
        harvestTiming = "within_7_days";
      } else {
        harvestTiming = "upcoming";
      }
    }

    const recommendedActions = [];
    const isFuturePlantingDate = plantingDate && plantingDate > today;

    const monitoringStatus =
      isFuturePlantingDate &&
      ["growing", "ready"].includes(crop.status)
        ? "planned"
        : crop.status;

    if (crop.status === "harvested") {
      recommendedActions.push({
        priority: "low",
        action: "Harvest recorded",
        reason: "This crop is marked as harvested."
      });
    } else if (isFuturePlantingDate) {
      recommendedActions.push({
        priority: "low",
        action: "Prepare for planting",
        reason:
          "The planting date is in the future. Prepare the field and check planting conditions before planting."
      });
    } else if (crop.status === "ready") {
      recommendedActions.push({
        priority: "high",
        action: "Check harvest readiness",
        reason:
          "This crop is marked ready. Inspect the crop before harvesting."
      });
    } else if (harvestTiming === "overdue") {
      recommendedActions.push({
        priority: "high",
        action: "Inspect harvest readiness",
        reason:
          "The expected harvest date has passed. Check the crop's actual condition."
      });
    } else if (
      harvestTiming === "expected_today" ||
      harvestTiming === "within_7_days"
    ) {
      recommendedActions.push({
        priority: "medium",
        action: "Prepare for harvest",
        reason:
          "The expected harvest date is approaching. Check maturity and prepare storage or transport."
      });
    }

    if (crop.pests?.length > 0) {
      recommendedActions.push({
        priority: "high",
        action: "Inspect reported pests",
        reason:
          "Pests have been recorded for this crop. Inspect the affected plants."
      });
    }

    if (crop.diseases?.length > 0) {
      recommendedActions.push({
        priority: "high",
        action: "Inspect reported diseases",
        reason:
          "Diseases have been recorded for this crop. Assess the affected plants."
      });
    }

    const irrigation = crop.irrigation || {};

    if (
      crop.status !== "harvested" &&
      irrigation.nextWatering &&
      (!plantingDate || plantingDate <= today)
    ) {
      const nextWatering = new Date(irrigation.nextWatering);
      nextWatering.setUTCHours(0, 0, 0, 0);

      if (nextWatering < today) {
        recommendedActions.push({
          priority: "medium",
          action: "Check watering schedule",
          reason:
            "The scheduled watering date has passed. Check soil moisture before watering."
        });
      } else if (nextWatering.getTime() === today.getTime()) {
        recommendedActions.push({
          priority: "medium",
          action: "Check today's watering",
          reason:
            "Watering is scheduled for today. Check soil moisture and weather conditions."
        });
      }
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push({
        priority: "low",
        action: "Continue crop monitoring",
        reason:
          "No immediate action was identified from the available crop records."
      });
    }

    return res.status(200).json({
      message: "Crop monitoring retrieved successfully",
      monitoring: {
        cropId: crop.crop_id,
        cropName: crop.crop_name,
        status: monitoringStatus,
        plantingDate: crop.planting_date,
        expectedHarvestDate: crop.expected_harvest_date || null,
        totalGrowingDays,
        elapsedDays,
        daysUntilHarvest,
        progressPercentage,
        harvestTiming,
        pests: crop.pests || [],
        diseases: crop.diseases || [],
        nextWatering:
          plantingDate && plantingDate > today
            ? null
            : irrigation.nextWatering || null,
        recommendedActions
      },
      note:
        "Progress and harvest timing are calendar-based estimates, not direct measurements of crop maturity."
    });
  } catch (error) {
    console.error("Error retrieving crop monitoring:", error.message);
    return res.status(500).json({
      message: "Error retrieving crop monitoring",
      error: error.message
    });
  }
};

module.exports = {
  createCrop,
  getMyCrops,
  updateCrop,
  deleteCrop,
  predictHarvest,
  getWateringReminder,
  addCareActivity,
  getCareHistory,
  getCropMonitoring
};
