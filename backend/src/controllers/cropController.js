
const Crop = require("../models/Crop");
const Farm = require("../models/Farm");
const cropCatalog = require("../data/cropCatalog");

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

    const existingFarm = await Farm.findById(farm);

    if (!existingFarm) {
      return res.status(404).json({
        message: "Farm not found"
      });
    }

    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in authentication token"
      });
    }

    if (existingFarm.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to add a crop to this farm"
      });
    }

    const newCrop = await Crop.create({
      name: cropInfo.name,
      type: cropInfo.type,
      growingPeriod: cropInfo.growingPeriod,
      commonPests: cropInfo.commonPests,
      commonDiseases: cropInfo.commonDiseases,
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
    });

    return res.status(201).json({
      message: "Crop created successfully",
      crop: newCrop
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating crop",
      error: error.message
    });
  }
};

// Get all crops belonging to the logged-in farmer
const getMyCrops = async (req, res) => {
  try {
    const userId = req.user.userId;
    const farms = await Farm.find({ owner: userId }).select("_id");
    const farmIds = farms.map((farm) => farm._id);

    const crops = await Crop.find({
  farm: { $in: farmIds }
    })
  .sort({ createdAt: -1 })
  .populate("farm", "name location");

    return res.status(200).json({
      message: "Crops retrieved successfully",
      count: crops.length,
      crops
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving crops",
      error: error.message
    });
  }
};

 // update a crop.
const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to update this crop"
      });
    }

    // Validate status changes before saving.
    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "planned",
        "growing",
        "ready",
        "harvested"
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid crop status",
          allowedStatuses
        });
      }

      // Use the planting date from the request if supplied;
      // otherwise, use the crop's existing planting date.
      const proposedPlantingDate =
        req.body.plantingDate !== undefined
          ? req.body.plantingDate
          : crop.plantingDate;

      const plantingDate = proposedPlantingDate
        ? new Date(proposedPlantingDate)
        : null;

      if (proposedPlantingDate && Number.isNaN(plantingDate.getTime())) {
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

    const allowedFields = [
      "plantingDate",
      "expectedHarvestDate",
      "status",
      "irrigation",
      "fertilizer",
      "pesticide",
      "pests",
      "diseases",
      "notes"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        crop.set(field, req.body[field]);
      }
    }

    await crop.save();

    return res.status(200).json({
      message: "Crop updated successfully",
      crop
    });
  } catch (error) {
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
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to delete this crop"
      });
    }

    await Crop.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Crop deleted successfully"
    });
  } catch (error) {
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
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to view this crop"
      });
    }

    const minimumDays = crop.growingPeriod?.minimumDays;
    const maximumDays = crop.growingPeriod?.maximumDays;

    if (
      !crop.plantingDate ||
      typeof minimumDays !== "number" ||
      typeof maximumDays !== "number"
    ) {
      return res.status(400).json({
        message: "Planting date or growing period is missing"
      });
    }

    const earliestHarvest = new Date(crop.plantingDate);
    earliestHarvest.setUTCDate(
      earliestHarvest.getUTCDate() + minimumDays
    );

    const latestHarvest = new Date(crop.plantingDate);
    latestHarvest.setUTCDate(
      latestHarvest.getUTCDate() + maximumDays
    );

    return res.status(200).json({
      message: "Harvest prediction generated successfully",
      crop: crop.name,
      plantingDate: crop.plantingDate,
      growingPeriod: {
        minimumDays,
        maximumDays
      },
      estimatedHarvestWindow: {
        earliest: earliestHarvest.toISOString().slice(0, 10),
        latest: latestHarvest.toISOString().slice(0, 10)
      },
      note: "This is an estimate. Actual harvest timing depends on crop variety, weather, and growing conditions."
    });
  } catch (error) {
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
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to view this crop"
      });
    }

    const irrigation = crop.irrigation;

    if (!irrigation || !irrigation.nextWatering) {
      return res.status(200).json({
        message: "No watering schedule available for this crop",
        crop: crop.name,
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
      crop: crop.name,
      wateringFrequency: irrigation.frequency || null,
      lastWatered: irrigation.lastWatered || null,
      nextWatering: irrigation.nextWatering,
      reminder
    });
  } catch (error) {
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
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to update this crop"
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

    if (!activityType || !description) {
      return res.status(400).json({
        message: "Activity type and description are required"
      });
    }

    crop.careHistory.push({
      activityType,
      date,
      description,
      product,
      quantity,
      notes
    });

    await crop.save();

    return res.status(201).json({
      message: "Care activity added successfully",
      careHistory: crop.careHistory
    });
  } catch (error) {
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
    const userId = req.user.userId;
    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to view this crop"
      });
    }

    return res.status(200).json({
      message: "Care history retrieved successfully",
      crop: crop.name,
      count: crop.careHistory.length,
      careHistory: crop.careHistory
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving care history",
      error: error.message
    });
  }
};


const getCropMonitoring = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const crop = await Crop.findById(id);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found"
      });
    }

    // Confirm that the crop belongs to the logged-in farmer.
    const farm = await Farm.findOne({
      _id: crop.farm,
      owner: userId
    });

    if (!farm) {
      return res.status(403).json({
        message: "You are not authorized to view this crop"
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const plantingDate = crop.plantingDate
      ? new Date(crop.plantingDate)
      : null;

    if (plantingDate) {
      plantingDate.setUTCHours(0, 0, 0, 0);
    }

    const harvestDate = crop.expectedHarvestDate
      ? new Date(crop.expectedHarvestDate)
      : null;

    if (harvestDate) {
      harvestDate.setUTCHours(0, 0, 0, 0);
    }

    const totalGrowingDays =
      plantingDate && harvestDate
        ? Math.round(
            (harvestDate - plantingDate) / 86400000
          )
        : null;

    const elapsedDays = plantingDate
      ? Math.max(
          0,
          Math.floor(
            (today - plantingDate) / 86400000
          )
        )
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

    const isFuturePlantingDate =
    plantingDate && plantingDate > today;

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

     if (
        crop.status !== "harvested" &&
        crop.irrigation?.nextWatering &&
        (!plantingDate || plantingDate <= today)
    ) {
      const nextWatering = new Date(crop.irrigation.nextWatering);
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
        cropId: crop._id,
        cropName: crop.name,
        status: monitoringStatus,
        plantingDate: crop.plantingDate,
        expectedHarvestDate: crop.expectedHarvestDate || null,
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
        : crop.irrigation?.nextWatering || null,
        recommendedActions
      },
      note:
        "Progress and harvest timing are calendar-based estimates, not direct measurements of crop maturity."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving crop monitoring",
      error: error.message
    });
  }
};


// Export controller functions
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