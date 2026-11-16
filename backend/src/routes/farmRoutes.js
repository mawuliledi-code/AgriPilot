
const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createFarm,
  getMyFarms,
  deleteFarm
} = require("../controllers/farmController");

const {
  getFarmHealth
} = require("../controllers/farmHealthController");

const router = express.Router();

// Get farms belonging to the logged-in farmer
router.get("/my-farms", protect, getMyFarms);

// Get farm health report
router.get("/health", protect, getFarmHealth);

// Create a new farm
router.post("/", protect, createFarm);

// Delete a farm belonging to the logged-in farmer
router.delete("/:id", protect, deleteFarm);

module.exports = router;


