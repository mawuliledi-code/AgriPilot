
const pool = require("../config/postgres");

const validId = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

// Convert PostgreSQL completion rows into the existing API format.
const formatCompletion = (row) => ({
  _id: row.completion_id,
  farmer: row.farmer_id,
  farm: row.farm_id,
  crop: row.crop_id
    ? {
        _id: row.crop_id,
        name: row.crop_name || null,
      }
    : null,
  observationId: row.observation_id
    ? {
        _id: row.observation_id,
        name: row.observation_name || null,
        observationType: row.observation_type || null,
        severity: row.severity || null,
        status: row.observation_status || null,
      }
    : null,
  weatherEventId: row.weather_event_id,
  actionType: row.action_type,
  actionDescription: row.action_description,
  outcome: row.outcome,
  notes: row.notes,
  status: row.status,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getOwnedFarm = async (farmId, userId) => {
  if (!validId(farmId)) return null;

  const result = await pool.query(
    `SELECT farm_id, farm_name
     FROM farms
     WHERE farm_id = $1 AND user_id = $2`,
    [Number(farmId), userId]
  );

  return result.rows[0] || null;
};

const getCompletion = async (completionId, farmId, userId) => {
  const result = await pool.query(
    `SELECT fc.*,
            c.crop_name,
            o.name AS observation_name,
            o.observation_type,
            o.severity,
            o.status AS observation_status
     FROM farmer_action_completions fc
     LEFT JOIN crops c ON c.crop_id = fc.crop_id
     LEFT JOIN crop_health_observations o
       ON o.observation_id = fc.observation_id
     WHERE fc.completion_id = $1
       AND fc.farm_id = $2
       AND fc.farmer_id = $3`,
    [Number(completionId), farmId, userId]
  );

  return result.rows[0] || null;
};

// Mark a farm action as completed.
const completeAction = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.userId;

    const {
      cropId,
      observationId,
      weatherEventId,
      actionType,
      actionDescription,
      outcome,
      notes,
    } = req.body;

    const farm = await getOwnedFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    if (
      typeof actionType !== "string" ||
      !actionType.trim() ||
      typeof actionDescription !== "string" ||
      !actionDescription.trim()
    ) {
      return res.status(400).json({
        message: "Action type and description are required.",
      });
    }

    if (weatherEventId !== undefined && weatherEventId !== null) {
      if (
        typeof weatherEventId !== "string" ||
        !weatherEventId.trim() ||
        weatherEventId.trim().length > 200
      ) {
        return res.status(400).json({
          message:
            "weatherEventId must be a non-empty string of at most 200 characters.",
        });
      }
    }

    let crop = null;

    if (cropId !== undefined && cropId !== null) {
      if (!validId(cropId)) {
        return res.status(404).json({
          message: "Crop not found in this farm.",
        });
      }

      const cropResult = await pool.query(
        `SELECT crop_id
         FROM crops
         WHERE crop_id = $1 AND farm_id = $2`,
        [Number(cropId), farm.farm_id]
      );

      crop = cropResult.rows[0];

      if (!crop) {
        return res.status(404).json({
          message: "Crop not found in this farm.",
        });
      }
    }

    let observation = null;

    if (observationId !== undefined && observationId !== null) {
      if (!crop) {
        return res.status(400).json({
          message:
            "A valid cropId is required when providing observationId.",
        });
      }

      if (!validId(observationId)) {
        return res.status(404).json({
          message:
            "Crop health observation not found for this farmer and crop.",
        });
      }

      const observationResult = await pool.query(
        `SELECT observation_id
         FROM crop_health_observations
         WHERE observation_id = $1
           AND farmer_id = $2
           AND crop_id = $3`,
        [Number(observationId), userId, crop.crop_id]
      );

      observation = observationResult.rows[0];

      if (!observation) {
        return res.status(404).json({
          message:
            "Crop health observation not found for this farmer and crop.",
        });
      }
    }

    const cleanActionType = actionType.trim();
    const cleanWeatherEventId =
      typeof weatherEventId === "string" && weatherEventId.trim()
        ? weatherEventId.trim()
        : null;

    // Prevent duplicate completion for the same observation.
    if (observation) {
      const existing = await pool.query(
        `SELECT *
         FROM farmer_action_completions
         WHERE farmer_id = $1
           AND farm_id = $2
           AND observation_id = $3
           AND action_type = $4
         LIMIT 1`,
        [userId, farm.farm_id, observation.observation_id, cleanActionType]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          message:
            "This action has already been marked as completed for this observation.",
          completion: formatCompletion(existing.rows[0]),
        });
      }
    }

    // Prevent duplicate completion for the same weather event.
    if (cleanWeatherEventId) {
      const existing = await pool.query(
        `SELECT *
         FROM farmer_action_completions
         WHERE farmer_id = $1
           AND farm_id = $2
           AND action_type = $3
           AND weather_event_id = $4
         LIMIT 1`,
        [userId, farm.farm_id, cleanActionType, cleanWeatherEventId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          message:
            "This weather action has already been completed for this event.",
          completion: formatCompletion(existing.rows[0]),
        });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO farmer_action_completions
         (farmer_id, farm_id, crop_id, observation_id,
          weather_event_id, action_type, action_description,
          outcome, notes, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        userId,
        farm.farm_id,
        crop ? crop.crop_id : null,
        observation ? observation.observation_id : null,
        cleanWeatherEventId,
        cleanActionType,
        actionDescription.trim(),
        outcome || null,
        notes || null,
      ]
    );

    const completion = await getCompletion(
      insertResult.rows[0].completion_id,
      farm.farm_id,
      userId
    );

    return res.status(201).json({
      message: "Action marked as completed successfully.",
      completion: formatCompletion(completion),
    });
  } catch (error) {
    console.error("Complete action error:", error);

    return res.status(500).json({
      message: "Failed to mark action as completed.",
    });
  }
};

// Retrieve completed actions for a farm.
const getActionCompletionHistory = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.userId;

    const farm = await getOwnedFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    const result = await pool.query(
      `SELECT fc.*,
              c.crop_name,
              o.name AS observation_name,
              o.observation_type,
              o.severity,
              o.status AS observation_status
       FROM farmer_action_completions fc
       LEFT JOIN crops c ON c.crop_id = fc.crop_id
       LEFT JOIN crop_health_observations o
         ON o.observation_id = fc.observation_id
       WHERE fc.farmer_id = $1 AND fc.farm_id = $2
       ORDER BY fc.completed_at DESC`,
      [userId, farm.farm_id]
    );

    const completions = result.rows.map(formatCompletion);

    return res.status(200).json({
      message: "Action completion history retrieved successfully.",
      farm: {
        id: farm.farm_id,
        name: farm.farm_name,
      },
      totalCompletions: completions.length,
      completions,
    });
  } catch (error) {
    console.error("Action completion history error:", error);

    return res.status(500).json({
      message: "Failed to retrieve action completion history.",
    });
  }
};

// Update an existing completed action.
const updateActionCompletion = async (req, res) => {
  try {
    const { farmId, completionId } = req.params;
    const userId = req.user.userId;
    const { outcome, notes } = req.body;

    const farm = await getOwnedFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    if (!validId(completionId)) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    if (outcome === undefined && notes === undefined) {
      return res.status(400).json({
        message: "Provide an outcome or notes to update.",
      });
    }

    if (
      outcome !== undefined &&
      (typeof outcome !== "string" || outcome.length > 1000)
    ) {
      return res.status(400).json({
        message: "Outcome must be text with a maximum of 1000 characters.",
      });
    }

    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 1000)
    ) {
      return res.status(400).json({
        message: "Notes must be text with a maximum of 1000 characters.",
      });
    }

    const existing = await getCompletion(
      completionId,
      farm.farm_id,
      userId
    );

    if (!existing) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    const result = await pool.query(
      `UPDATE farmer_action_completions
       SET outcome = CASE WHEN $1::boolean THEN $2 ELSE outcome END,
           notes = CASE WHEN $3::boolean THEN $4 ELSE notes END,
           updated_at = CURRENT_TIMESTAMP
       WHERE completion_id = $5
         AND farm_id = $6
         AND farmer_id = $7
       RETURNING completion_id`,
      [
        outcome !== undefined,
        outcome !== undefined ? outcome.trim() : null,
        notes !== undefined,
        notes !== undefined ? notes.trim() : null,
        Number(completionId),
        farm.farm_id,
        userId,
      ]
    );

    const updated = await getCompletion(
      result.rows[0].completion_id,
      farm.farm_id,
      userId
    );

    return res.status(200).json({
      message: "Action completion updated successfully.",
      completion: formatCompletion(updated),
    });
  } catch (error) {
    console.error("Update action completion error:", error);

    return res.status(500).json({
      message: "Failed to update action completion.",
    });
  }
};

// Delete one completion belonging to the logged-in farmer.
const deleteActionCompletion = async (req, res) => {
  try {
    const { farmId, completionId } = req.params;
    const userId = req.user.userId;

    const farm = await getOwnedFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    if (!validId(completionId)) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    const result = await pool.query(
      `DELETE FROM farmer_action_completions
       WHERE completion_id = $1
         AND farm_id = $2
         AND farmer_id = $3
       RETURNING completion_id`,
      [Number(completionId), farm.farm_id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    return res.status(200).json({
      message: "Action completion deleted successfully.",
      deletedCompletionId: result.rows[0].completion_id,
    });
  } catch (error) {
    console.error("Delete action completion error:", error);

    return res.status(500).json({
      message: "Failed to delete action completion.",
    });
  }
};

module.exports = {
  completeAction,
  getActionCompletionHistory,
  updateActionCompletion,
  deleteActionCompletion,
};
