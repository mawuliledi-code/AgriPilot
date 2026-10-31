
const Farm = require("../models/Farm");
const Crop = require("../models/Crop");
const CropHealth = require("../models/CropHealth");
const ActionCompletion = require("../models/ActionCompletion");

const completeAction = async (req, res) => {
  try {
    const { farmId } = req.params;

    const {
      cropId,
      observationId,
      weatherEventId,
      actionType,
      actionDescription,
      outcome,
      notes,
    } = req.body;

    // Verify that the farm belongs to the logged-in farmer.
    const farm = await Farm.findOne({
      _id: farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    // Validate required fields.
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

    // Validate the optional weather event identifier.
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

    // Verify the crop, if supplied.
    let crop = null;

    if (cropId) {
      crop = await Crop.findOne({
        _id: cropId,
        farm: farm._id,
      });

      if (!crop) {
        return res.status(404).json({
          message: "Crop not found in this farm.",
        });
      }
    }

    // Verify the observation, if supplied.
    let observation = null;

    if (observationId) {
      if (!crop) {
        return res.status(400).json({
          message:
            "A valid cropId is required when providing observationId.",
        });
      }

      observation = await CropHealth.findOne({
        _id: observationId,
        farmer: req.user.userId,
        crop: crop._id,
      });

      if (!observation) {
        return res.status(404).json({
          message:
            "Crop health observation not found for this farmer and crop.",
        });
      }
    }

    // Prevent duplicate completions for the same crop-health observation.
    if (observation) {
      const existingCompletion = await ActionCompletion.findOne({
        farmer: req.user.userId,
        farm: farm._id,
        observationId: observation._id,
        actionType: actionType.trim(),
      });

      if (existingCompletion) {
        return res.status(409).json({
          message:
            "This action has already been marked as completed for this observation.",
          completion: existingCompletion,
        });
      }
    }

    // Prevent duplicate submissions for the same weather event.
    if (weatherEventId !== undefined && weatherEventId !== null) {
      const existingWeatherCompletion = await ActionCompletion.findOne({
        farmer: req.user.userId,
        farm: farm._id,
        actionType: actionType.trim(),
        weatherEventId: weatherEventId.trim(),
      });

      if (existingWeatherCompletion) {
        return res.status(409).json({
          message:
            "This weather action has already been completed for this event.",
          completion: existingWeatherCompletion,
        });
      }
    }

    // Save the completed action.
    const completedAction = await ActionCompletion.create({
      farmer: req.user.userId,
      farm: farm._id,
      crop: crop ? crop._id : null,
      observationId: observation ? observation._id : null,
      weatherEventId:
        typeof weatherEventId === "string" && weatherEventId.trim()
          ? weatherEventId.trim()
          : null,
      actionType: actionType.trim(),
      actionDescription: actionDescription.trim(),
      outcome,
      notes,
      status: "completed",
      completedAt: new Date(),
    });

    return res.status(201).json({
      message: "Action marked as completed successfully.",
      completion: completedAction,
    });
  } catch (error) {
    // Handle duplicate-key errors from MongoDB indexes.
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "This action has already been marked as completed for this observation or weather event.",
      });
    }

    console.error("Complete action error:", error);

    return res.status(500).json({
      message: "Failed to mark action as completed.",
    });
  }
};

const getActionCompletionHistory = async (req, res) => {
  try {
    const { farmId } = req.params;

    const farm = await Farm.findOne({
      _id: farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    const completions = await ActionCompletion.find({
      farmer: req.user.userId,
      farm: farm._id,
    })
      .populate("crop", "name")
      .populate("observationId", "name observationType severity status")
      .sort({ completedAt: -1 });

    return res.status(200).json({
      message: "Action completion history retrieved successfully.",
      farm: {
        id: farm._id,
        name: farm.name,
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

const updateActionCompletion = async (req, res) => {
  try {
    const { farmId, completionId } = req.params;
    const { outcome, notes } = req.body;

    const farm = await Farm.findOne({
      _id: farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    if (outcome === undefined && notes === undefined) {
      return res.status(400).json({
        message: "Provide an outcome or notes to update.",
      });
    }

    const completion = await ActionCompletion.findOne({
      _id: completionId,
      farmer: req.user.userId,
      farm: farm._id,
    });

    if (!completion) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    if (outcome !== undefined) {
      if (typeof outcome !== "string" || outcome.length > 1000) {
        return res.status(400).json({
          message:
            "Outcome must be text with a maximum of 1000 characters.",
        });
      }

      completion.outcome = outcome.trim();
    }

    if (notes !== undefined) {
      if (typeof notes !== "string" || notes.length > 1000) {
        return res.status(400).json({
          message:
            "Notes must be text with a maximum of 1000 characters.",
        });
      }

      completion.notes = notes.trim();
    }

    await completion.save();

    return res.status(200).json({
      message: "Action completion updated successfully.",
      completion,
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

    const farm = await Farm.findOne({
      _id: farmId,
      owner: req.user.userId,
    });

    if (!farm) {
      return res.status(404).json({
        message: "Farm not found.",
      });
    }

    const completion = await ActionCompletion.findOne({
      _id: completionId,
      farmer: req.user.userId,
      farm: farm._id,
    });

    if (!completion) {
      return res.status(404).json({
        message: "Action completion not found.",
      });
    }

    await ActionCompletion.deleteOne({
      _id: completion._id,
    });

    return res.status(200).json({
      message: "Action completion deleted successfully.",
      deletedCompletionId: completion._id,
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

