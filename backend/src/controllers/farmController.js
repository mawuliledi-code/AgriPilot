
const pool = require("../config/postgres");

// Find farm coordinates automatically using Open-Meteo.
const getFarmCoordinates = async (city, country) => {
    const url = new URL(
        "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.searchParams.set("name", city);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Location lookup service is unavailable");
    }

    const data = await response.json();

    const match = data.results?.find(
        place => place.country?.toLowerCase() === country.toLowerCase()
    );

    if (!match) {
        return null;
    }

    return {
        latitude: match.latitude,
        longitude: match.longitude
    };
};

// Convert a PostgreSQL farm row into the existing frontend response format.
const formatFarm = (row) => {
    const locationParts = (row.location || "").split(",").map(part => part.trim());

    return {
        _id: row.farm_id,
        owner: row.user_id,
        name: row.farm_name,
        location: {
            city: row.city || locationParts[0] || "",
            country: row.country || locationParts[1] || ""
        },
        size: Number(row.farm_size),
        crops: row.crop_names || [],
        latitude: row.latitude,
        longitude: row.longitude,
        weatherCache: row.weather_cache
            ? {
                data: row.weather_cache,
                fetchedAt: row.weather_fetched_at
            }
            : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

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

        if (
            !name ||
            !location ||
            !location.city ||
            !location.country ||
            size === undefined ||
            size === null
        ) {
            return res.status(400).json({
                message: "Farm name, location and size are required"
            });
        }

        if (
            !Number.isFinite(Number(size)) ||
            Number(size) < 0
        ) {
            return res.status(400).json({
                message: "Invalid farm size"
            });
        }

        if (
            (latitude !== undefined &&
                latitude !== null &&
                (!Number.isFinite(Number(latitude)) ||
                    Number(latitude) < -90 ||
                    Number(latitude) > 90)) ||
            (longitude !== undefined &&
                longitude !== null &&
                (!Number.isFinite(Number(longitude)) ||
                    Number(longitude) < -180 ||
                    Number(longitude) > 180))
        ) {
            return res.status(400).json({
                message: "Invalid latitude or longitude"
            });
        }

        const city = String(location.city).trim();
        const country = String(location.country).trim();

        // Automatically find coordinates if the farmer did not provide them.
        let farmLatitude = latitude ?? null;
        let farmLongitude = longitude ?? null;

        if (farmLatitude === null || farmLongitude === null) {
            try {
                const coordinates = await getFarmCoordinates(city, country);

                if (coordinates) {
                    farmLatitude = coordinates.latitude;
                    farmLongitude = coordinates.longitude;
                }
            } catch (error) {
                console.error("Farm geocoding error:", error.message);
            }
        }

        const result = await pool.query(
            `INSERT INTO farms
                (user_id, farm_name, location, farm_size, city, country,
                 latitude, longitude, crop_names)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                req.user.userId,
                name.trim(),
                `${city}, ${country}`,
                Number(size),
                city,
                country,
                farmLatitude,
            farmLongitude,
                JSON.stringify(Array.isArray(crops) ? crops : [])
            ]
        );

        return res.status(201).json({
            message: "Farm created successfully",
            farm: formatFarm(result.rows[0])
        });

    } catch (error) {
        console.error("Create farm error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// Get all farms belonging to the logged-in farmer.
const getMyFarms = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM farms
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        const farms = result.rows.map(formatFarm);

        return res.status(200).json({
            message: "Farms retrieved successfully",
            count: farms.length,
            farms
        });

    } catch (error) {
        console.error("Error retrieving farms:", error.message);

        return res.status(500).json({
            message: "Error retrieving farms"
        });
    }
};

// Delete only farms belonging to the logged-in farmer.
// Preserve farms that have historical action completions.
const deleteFarm = async (req, res) => {
    try {
        const { id } = req.params;
        const farmId = Number(id);

        if (!Number.isInteger(farmId) || farmId <= 0) {
            return res.status(400).json({
                message: "Invalid farm ID"
            });
        }

        const existingFarm = await pool.query(
            `SELECT farm_id
             FROM farms
             WHERE farm_id = $1 AND user_id = $2`,
            [farmId, req.user.userId]
        );

        if (existingFarm.rows.length === 0) {
            return res.status(404).json({
                message: "Farm not found or you are not authorized to delete it."
            });
        }

        const completions = await pool.query(
            `SELECT completion_id
             FROM farmer_action_completions
             WHERE farm_id = $1
             LIMIT 1`,
            [farmId]
        );

        if (completions.rows.length > 0) {
            return res.status(409).json({
                message: "This farm has historical action completions and cannot be deleted."
            });
        }

        await pool.query(
            `DELETE FROM farms
             WHERE farm_id = $1 AND user_id = $2`,
            [farmId, req.user.userId]
        );

        return res.status(200).json({
            message: "Farm deleted successfully."
        });

    } catch (error) {
        console.error("Delete farm error:", error.message);

        return res.status(500).json({
            message: "Failed to delete farm."
        });
    }
};

module.exports = {
    createFarm,
    getMyFarms,
    deleteFarm
};

