
const Crop = require("../models/Crop");
const CropHealth = require("../models/CropHealth");
const generateCropHealthRecommendations = require("../utils/cropHealthRecommendations");

// Record a new crop health observation
const createHealthObservation = async (req, res) => {
  try {
    const {
      observationType,
      name,
      observationDate,
      severity,
      symptoms,
      notes,
      treatmentApplied,
      status,
    } = req.body;

    if (!observationType || !name || !severity) {
      return res.status(400).json({
        message: "Observation type, name, and severity are required",
      });
    }

    const validTypes = ["pest", "disease", "other"];
    const validSeverities = ["low", "medium", "high"];
    const validStatuses = [
      "observed",
      "treatment_applied",
      "resolved",
    ];

    if (!validTypes.includes(observationType)) {
      return res.status(400).json({
        message: "Invalid observation type",
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        message: "Invalid severity",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid observation status",
      });
    }

    const crop = await Crop.findById(req.params.cropId);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const cropFarm = await require("../models/Farm").findOne({
      _id: crop.farm,
      owner: req.user.userId,
    });

    if (!cropFarm) {
      return res.status(403).json({
        message: "You are not authorized to access this crop",
      });
    }

    const observation = await CropHealth.create({
      crop: crop._id,
      farmer: req.user.userId,
      observationType,
      name,
      observationDate,
      severity,
      symptoms,
      notes,
      treatmentApplied,
      status,
    });

    return res.status(201).json({
      message: "Crop health observation recorded successfully",
      observation,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error recording crop health observation",
      error: error.message,
    });
  }
};

// Retrieve health observations for one crop
const getCropHealthHistory = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const cropFarm = await require("../models/Farm").findOne({
      _id: crop.farm,
      owner: req.user.userId,
    });

    if (!cropFarm) {
      return res.status(403).json({
        message: "You are not authorized to access this crop",
      });
    }

    const observations = await CropHealth.find({
      crop: crop._id,
      farmer: req.user.userId,
    }).sort({ observationDate: -1 });

    return res.status(200).json({
      crop: crop.name,
      count: observations.length,
      observations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving crop health history",
      error: error.message,
    });
  }
};


const updateHealthObservation = async (req, res) => {
  try {
    const { severity, symptoms, notes, treatmentApplied, status } = req.body;

    const observation = await CropHealth.findOne({
      _id: req.params.observationId,
      farmer: req.user.userId,
    });

    if (!observation) {
      return res.status(404).json({
        message: "Health observation not found",
      });
    }

    const allowedFields = {
      severity: ["low", "medium", "high"],
      status: ["observed", "treatment_applied", "resolved"],
    };

    if (
      severity !== undefined &&
      !allowedFields.severity.includes(severity)
    ) {
      return res.status(400).json({
        message: "Invalid severity",
      });
    }

    if (
      status !== undefined &&
      !allowedFields.status.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    if (severity !== undefined) observation.severity = severity;
    if (symptoms !== undefined) observation.symptoms = symptoms;
    if (notes !== undefined) observation.notes = notes;
    if (treatmentApplied !== undefined) {
      observation.treatmentApplied = treatmentApplied;
    }
    if (status !== undefined) observation.status = status;

    await observation.save();

    return res.status(200).json({
      message: "Crop health observation updated successfully",
      observation,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating crop health observation",
      error: error.message,
    });
  }
};


const getHealthRecommendations = async (req, res) => {
  try {
    const observation = await CropHealth.findOne({
      _id: req.params.observationId,
      farmer: req.user.userId,
    });

    if (!observation) {
      return res.status(404).json({
        message: "Health observation not found",
      });
    }

    const crop = await Crop.findById(observation.crop);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const recommendation = generateCropHealthRecommendations(
      observation
    );

    return res.status(200).json({
      message: "Crop health recommendations generated successfully",
      crop: crop.name,
      recommendation,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error generating crop health recommendations",
      error: error.message,
    });
  }
};


const getCropHealthDashboard = async (req, res) => {
  try {
    const CropHealth = require("../models/CropHealth");

    const observations = await CropHealth.find({
      farmer: req.user.userId,
    })
      .populate("crop", "name")
      .sort({ observationDate: -1 });

    
const summary = {
  totalObservations: observations.length,

  highSeverity: observations.filter(
    (item) => item.severity === "high"
  ).length,

  mediumSeverity: observations.filter(
    (item) => item.severity === "medium"
  ).length,

  lowSeverity: observations.filter(
    (item) => item.severity === "low"
  ).length,

  treatmentApplied: observations.filter(
    (item) => item.status === "treatment_applied"
  ).length,

  resolved: observations.filter(
    (item) => item.status === "resolved"
  ).length,
};

    return res.status(200).json({
      message: "Crop health dashboard retrieved successfully",
      summary,
      observations,
    });
  } catch (error) {
    console.error("Crop health dashboard error:", error);

    return res.status(500).json({
      message: "Error retrieving crop health dashboard",
      error: error.message,
    });
  }
};

module.exports = {
  createHealthObservation,
  getCropHealthHistory,
  updateHealthObservation,
  getHealthRecommendations,
  getCropHealthDashboard,
};