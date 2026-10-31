
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  getCropActionPlan,
} = require("../controllers/cropActionPlannerController");

router.get("/:farmId", protect, getCropActionPlan);

module.exports = router;