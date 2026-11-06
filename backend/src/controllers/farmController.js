
const Farm = require("../models/Farm");

const createFarm = async (req, res) => {
    try {
        const {
            name,
            location,
            size,
            crops,
            latitude,
            longitude
        } = req.body;

        if (!name || !location || !location.city || !location.country || size === undefined || size === null) {
            return res.status(400).json({
                message: "Farm name, location and size are required"
            });
        }

        // Validate coordinates when they are provided
        if (
            (latitude !== undefined &&
                (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
            (longitude !== undefined &&
                (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
        ) {
            return res.status(400).json({
                message: "Invalid latitude or longitude"
            });
        }

        const farm = await Farm.create({
            owner: req.user.userId,
            name,
            location,
            size,
            crops: crops || [],
            latitude,
            longitude
        });

        res.status(201).json({
            message: "Farm created successfully",
            farm
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// Get all farms belonging to the logged-in farmer
const getMyFarms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const farms = await Farm.find({ owner: userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Farms retrieved successfully",
      count: farms.length,
      farms
    });

  } catch (error) {
    console.error("Error retrieving farms:", error);

    return res.status(500).json({
      message: "Error retrieving farms",
      error: error.message
    });
  }
};

module.exports = {
    createFarm,
    getMyFarms
};

