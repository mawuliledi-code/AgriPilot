const express = require("express");

const protect = require("../middleware/authMiddleware");
const { createFarm } = require("../controllers/farmController");

const router = express.Router();

router.post("/", protect, createFarm);

module.exports = router;