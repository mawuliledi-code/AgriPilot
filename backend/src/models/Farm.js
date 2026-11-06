
const mongoose = require("mongoose");

const farmSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      city: {
        type: String,
        required: true,
        trim: true,
      },

      country: {
        type: String,
        required: true,
        trim: true,
      },
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },

    size: {
      type: Number,
      required: true,
      min: 0.01,
    },

    crops: [
      {
        type: String,
        trim: true,
      },
    ],

    // Cache the most recently retrieved farm weather
    weatherCache: {
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },

      fetchedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Farm", farmSchema);
