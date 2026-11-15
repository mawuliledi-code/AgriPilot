
const postgresPool = require("../config/postgres");

const recordFertilizerApplication = async (req, res) => {
    const { crop_id, activity_date, notes } = req.body;

    if (!crop_id || !activity_date) {
        return res.status(400).json({
            message: "crop_id and activity_date are required"
        });
    }

    const client = await postgresPool.connect();

    try {
        await client.query("BEGIN");

        // 1. Record fertilizer application.
        await client.query(
            `INSERT INTO care_activities
                (crop_id, activity_type, activity_date, notes)
             VALUES ($1, $2, $3, $4)`,
            [crop_id, "Fertilizer application", activity_date, notes || null]
        );

        // 2. Update the crop's fertilizer date.
        const updateResult = await client.query(
            `UPDATE crops
             SET last_fertilizer_applied = $1
             WHERE crop_id = $2`,
            [activity_date, crop_id]
        );

        if (updateResult.rowCount === 0) {
            throw new Error("Crop not found");
        }

        // 3. Save both operations.
        await client.query("COMMIT");

        return res.status(201).json({
            message: "Fertilizer application recorded successfully",
            crop_id,
            activity_date
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Fertilizer transaction failed:", error.message);

        return res.status(500).json({
            message: "Fertilizer transaction failed",
            error: error.message
        });

    } finally {
        client.release();
    }
};

module.exports = { recordFertilizerApplication };
