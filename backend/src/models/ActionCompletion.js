
const mongoose = require("mongoose");

const actionCompletionSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      default: null,
    },

    observationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropHealth",
      
      default: null,
    },

    weatherEventId: {
      type: String,
      trim: true,
      default: null,
    },

    actionType: {
      type: String,
      required: true,
      trim: true,
    },

    actionDescription: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
      required: true,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },

    outcome: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Prevent duplicate completions for the same observation and action.
actionCompletionSchema.index(
  {
    farmer: 1,
    farm: 1,
    observationId: 1,
    actionType: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      observationId: { $type: "objectId" },
    },
    name: "unique_observation_action_completion",
  }
);

// Prevent duplicate completions for the same weather event and action.
actionCompletionSchema.index(
  {
    farmer: 1,
    farm: 1,
    actionType: 1,
    weatherEventId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      weatherEventId: { $type: "string" },
      observationId: null,
    },
    name: "unique_weather_event_completion",
  }
);

module.exports = mongoose.model(
  "ActionCompletion",
  actionCompletionSchema
);