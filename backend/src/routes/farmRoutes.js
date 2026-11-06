const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createFarm,
  getMyFarms
} = require("../controllers/farmController");

const router = express.Router();

// Get farms belonging to the logged-in farmer
router.get("/my-farms", protect, getMyFarms);

// Create a new farm
router.post("/", protect, createFarm);

module.exports = router;