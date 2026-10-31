const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    // Basic crop information
    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      required: true,
      trim: true
    },

    // Expected growing period from the crop catalog
    growingPeriod: {
      minimumDays: {
        type: Number
      },

      maximumDays: {
        type: Number
      }
    },

    // Common pests associated with this type of crop
    commonPests: [
      {
        type: String
      }
    ],

    // Common diseases associated with this type of crop
    commonDiseases: [
      {
        type: String
      }
    ],

    // Planting and harvest information
    plantingDate: {
      type: Date,
      required: true
    },

    expectedHarvestDate: {
      type: Date
    },

    status: {
      type: String,
      enum: ["planned", "growing", "ready", "harvested"],
      default: "planned"
    },

    // Farm this crop belongs to
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true
    },

    // Irrigation information
    irrigation: {
      frequency: {
        type: String
      },

      lastWatered: {
        type: Date
      },

      nextWatering: {
        type: Date
      }
    },

    // Fertilizer information
    fertilizer: {
      type: {
        type: String
      },

      lastApplied: {
        type: Date
      },

      nextApplication: {
        type: Date
      },

      quantity: {
        type: String
      },

      notes: {
        type: String
      }
    },

    // Pesticide information
    pesticide: {
      product: {
        type: String
      },

      targetPest: {
        type: String
      },

      lastApplied: {
        type: Date
      },

      nextReviewDate: {
        type: Date
      },

      notes: {
        type: String
      }
    },

    // Pests actually observed on this farm
    pests: [
      {
        type: String
      }
    ],

    // Diseases actually observed on this farm
    diseases: [
      {
        type: String
      }
    ],

    
    // History of care activities performed on this crop
    careHistory: [
      {
        activityType: {
          type: String,
          enum: [
            "watering",
            "fertilizing",
            "pesticide",
            "inspection",
            "weeding",
            "other"
          ],
          required: true
        },

        date: {
          type: Date,
          required: true,
          default: Date.now
        },

        description: {
          type: String,
          required: true,
          trim: true
        },

        product: {
          type: String,
          trim: true
        },

        quantity: {
          type: String,
          trim: true
        },

        notes: {
          type: String,
          trim: true
        }
      }
    ],

    // Additional farmer notes
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Crop", cropSchema);