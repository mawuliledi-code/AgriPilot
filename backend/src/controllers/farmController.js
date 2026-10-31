
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

module.exports = {
    createFarm
};