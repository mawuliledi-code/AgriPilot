const pool = require("../config/postgres");
const calculateFarmHealth = require("../utils/farmHealthCalculator");

const getFarmHealth = async (req, res) => {
  try {
    // Find all farms belonging to the logged-in farmer.
    const farmsResult = await pool.query(
      `SELECT farm_id
       FROM farms
       WHERE user_id = $1`,
      [req.user.userId]
    );

    const farmIds = farmsResult.rows.map((farm) => farm.farm_id);

    let crops = [];

    // Only query crops if the farmer has farms.
    if (farmIds.length > 0) {
      const cropsResult = await pool.query(
        `SELECT
           crop_name AS name,
           status,
           pests,
           diseases
         FROM crops
         WHERE farm_id = ANY($1::integer[])`,
        [farmIds]
      );

      crops = cropsResult.rows;
    }

    const healthReport = calculateFarmHealth(crops);

    return res.status(200).json({
      message: "Farm health calculated successfully",
      farmCount: farmsResult.rows.length,
      cropCount: crops.length,
      ...healthReport
    });

  } catch (error) {
    console.error("Farm health error:", error.message);

    return res.status(500).json({
      message: "Failed to calculate farm health"
    });
  }
};

module.exports = { getFarmHealth };