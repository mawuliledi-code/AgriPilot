
const Farm = require("../models/Farm");
const Crop = require("../models/Crop");
const calculateFarmHealth = require("../utils/farmHealthCalculator");

const getFarmHealth = async (req, res) => {
  try {
    // Find all farms belonging to the logged-in farmer
    const farms = await Farm.find({
      owner: req.user.userId
    });

    // Get the IDs of those farms
    const farmIds = farms.map((farm) => farm._id);

    // Find crops belonging to those farms
    const crops = await Crop.find({
      farm: { $in: farmIds }
    });

    // Calculate the farm health report
    const healthReport = calculateFarmHealth(crops);

    return res.status(200).json({
      message: "Farm health calculated successfully",
      farmCount: farms.length,
      cropCount: crops.length,
      ...healthReport
    });

  } catch (error) {
    console.error("Farm health error:", error);

    return res.status(500).json({
      message: "Failed to calculate farm health"
    });
  }
};

module.exports = { getFarmHealth };
