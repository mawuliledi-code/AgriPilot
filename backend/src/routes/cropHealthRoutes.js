
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createHealthObservation,
  getCropHealthHistory,
  updateHealthObservation,
  getHealthRecommendations,
  getCropHealthDashboard,
} = require("../controllers/cropHealthController");

// Get the farmer's crop health dashboard
router.get("/dashboard", protect, getCropHealthDashboard);

// Get recommendations for a health observation
router.get(
  "/observation/:observationId/recommendations",
  protect,
  getHealthRecommendations
);

// Update a crop health observation
router.patch(
  "/observation/:observationId",
  protect,
  updateHealthObservation
);

// Record a crop health observation
router.post("/:cropId", protect, createHealthObservation);

// Get health observation history for a crop
router.get("/:cropId", protect, getCropHealthHistory);

module.exports = router;