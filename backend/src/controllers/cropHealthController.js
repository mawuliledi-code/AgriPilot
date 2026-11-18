
const pool = require("../config/postgres");
const generateCropHealthRecommendations = require("../utils/crophealthRecommendations");

const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

const formatObservation = (row) => ({
  _id: row.observation_id,
  crop: row.crop_id,
  farmer: row.farmer_id,
  observationType: row.observation_type,
  name: row.name,
  observationDate: row.observation_date,
  severity: row.severity,
  symptoms: row.symptoms,
  notes: row.notes,
  treatmentApplied: row.treatment_applied,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getOwnedCrop = async (cropId, userId) => {
  if (!validId(cropId)) return null;

  const result = await pool.query(
    `SELECT c.crop_id, c.crop_name, c.farm_id
     FROM crops c
     INNER JOIN farms f ON f.farm_id = c.farm_id
     WHERE c.crop_id = $1 AND f.user_id = $2`,
    [Number(cropId), userId]
  );

  return result.rows[0] || null;
};

const getOwnedObservation = async (observationId, userId) => {
  if (!validId(observationId)) return null;

  const result = await pool.query(
    `SELECT o.*, c.crop_name
     FROM crop_health_observations o
     LEFT JOIN crops c ON c.crop_id = o.crop_id
     WHERE o.observation_id = $1 AND o.farmer_id = $2`,
    [Number(observationId), userId]
  );

  return result.rows[0] || null;
};

// Record a new crop health observation.
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

    const crop = await getOwnedCrop(req.params.cropId, req.user.userId);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO crop_health_observations
         (crop_id, farmer_id, observation_type, name,
          observation_date, severity, symptoms, notes,
          treatment_applied, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        crop.crop_id,
        req.user.userId,
        observationType,
        name,
        observationDate || new Date(),
        severity,
        symptoms ?? null,
        notes ?? null,
        treatmentApplied ?? null,
        status || "observed",
      ]
    );

    return res.status(201).json({
      message: "Crop health observation recorded successfully",
      observation: formatObservation(result.rows[0]),
    });
  } catch (error) {
    console.error("Create crop health observation error:", error);

    return res.status(500).json({
      message: "Error recording crop health observation",
      error: error.message,
    });
  }
};

// Retrieve health observations for one crop.
const getCropHealthHistory = async (req, res) => {
  try {
    const crop = await getOwnedCrop(req.params.cropId, req.user.userId);

    if (!crop) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM crop_health_observations
       WHERE crop_id = $1 AND farmer_id = $2
       ORDER BY observation_date DESC`,
      [crop.crop_id, req.user.userId]
    );

    const observations = result.rows.map(formatObservation);

    return res.status(200).json({
      crop: crop.crop_name,
      count: observations.length,
      observations,
    });
  } catch (error) {
    console.error("Crop health history error:", error);

    return res.status(500).json({
      message: "Error retrieving crop health history",
      error: error.message,
    });
  }
};

// Update an existing health observation.
const updateHealthObservation = async (req, res) => {
  try {
    const {
      severity,
      symptoms,
      notes,
      treatmentApplied,
      status,
    } = req.body;

    const observation = await getOwnedObservation(
      req.params.observationId,
      req.user.userId
    );

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

    const result = await pool.query(
      `UPDATE crop_health_observations
       SET severity = CASE WHEN $1::boolean THEN $2 ELSE severity END,
           symptoms = CASE WHEN $3::boolean THEN $4 ELSE symptoms END,
           notes = CASE WHEN $5::boolean THEN $6 ELSE notes END,
           treatment_applied = CASE WHEN $7::boolean THEN $8 ELSE treatment_applied END,
           status = CASE WHEN $9::boolean THEN $10 ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE observation_id = $11 AND farmer_id = $12
       RETURNING *`,
      [
        severity !== undefined,
        severity ?? null,
        symptoms !== undefined,
        symptoms ?? null,
        notes !== undefined,
        notes ?? null,
        treatmentApplied !== undefined,
        treatmentApplied ?? null,
        status !== undefined,
        status ?? null,
        observation.observation_id,
        req.user.userId,
      ]
    );

    return res.status(200).json({
      message: "Crop health observation updated successfully",
      observation: formatObservation(result.rows[0]),
    });
  } catch (error) {
    console.error("Update crop health observation error:", error);

    return res.status(500).json({
      message: "Error updating crop health observation",
      error: error.message,
    });
  }
};

// Generate recommendations for one health observation.
const getHealthRecommendations = async (req, res) => {
  try {
    const observation = await getOwnedObservation(
      req.params.observationId,
      req.user.userId
    );

    if (!observation) {
      return res.status(404).json({
        message: "Health observation not found",
      });
    }

    if (!observation.crop_id) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const cropResult = await pool.query(
      `SELECT *
       FROM crops
       WHERE crop_id = $1`,
      [observation.crop_id]
    );

    if (cropResult.rows.length === 0) {
      return res.status(404).json({
        message: "Crop not found",
      });
    }

    const cropRow = cropResult.rows[0];

    const crop = {
      _id: cropRow.crop_id,
      name: cropRow.crop_name,
      type: cropRow.crop_type,
      plantingDate: cropRow.planting_date,
      expectedHarvestDate: cropRow.expected_harvest_date,
      status: cropRow.status,
      growingPeriod: cropRow.growing_period,
      commonPests: cropRow.common_pests,
      commonDiseases: cropRow.common_diseases,
    };

    const recommendation = generateCropHealthRecommendations(
      formatObservation(observation)
    );

    return res.status(200).json({
      message: "Crop health recommendations generated successfully",
      crop: crop.name,
      recommendation,
    });
  } catch (error) {
    console.error("Crop health recommendations error:", error);

    return res.status(500).json({
      message: "Error generating crop health recommendations",
      error: error.message,
    });
  }
};

// Retrieve the crop health dashboard.
const getCropHealthDashboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.crop_name
       FROM crop_health_observations o
       LEFT JOIN crops c ON c.crop_id = o.crop_id
       WHERE o.farmer_id = $1
       ORDER BY o.observation_date DESC`,
      [req.user.userId]
    );

    const observations = result.rows.map((row) => ({
      ...formatObservation(row),
      crop: row.crop_id
        ? {
            _id: row.crop_id,
            name: row.crop_name,
          }
        : null,
    }));

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
