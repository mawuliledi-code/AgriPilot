
const express = require("express");
const router = express.Router();

const {
  createCrop,
  getMyCrops,
  updateCrop,
  deleteCrop,
  predictHarvest,
  getWateringReminder,
  addCareActivity,
  getCareHistory,
  getCropMonitoring
} = require("../controllers/cropController");

const protect = require("../middleware/authMiddleware");

// GET: Retrieve crops belonging to the logged-in farmer
router.get("/my-crops", protect, getMyCrops);

// POST: Create a new crop
router.post("/", protect, createCrop);
router.patch("/:id", protect, updateCrop);
router.delete("/:id", protect, deleteCrop);
router.get("/:id/harvest-prediction", protect, predictHarvest);
router.get("/:id/watering-reminder", protect, getWateringReminder);
router.post("/:id/care-history", protect, addCareActivity);
router.get("/:id/care-history", protect, getCareHistory);
router.get("/:id/monitoring", protect, getCropMonitoring);

module.exports = router;





