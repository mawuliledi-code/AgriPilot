
const mongoose = require("mongoose");

const cropHealthSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      required: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    observationType: {
      type: String,
      enum: ["pest", "disease", "other"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    observationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },

    symptoms: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    treatmentApplied: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["observed", "treatment_applied", "resolved"],
      default: "observed",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CropHealth", cropHealthSchema);