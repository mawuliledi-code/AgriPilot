
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getFarmWeather,
} = require("../controllers/weatherController");

router.get("/:farmId", protect, getFarmWeather);

module.exports = router;