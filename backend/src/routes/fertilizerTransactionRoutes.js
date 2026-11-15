
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    recordFertilizerApplication
} = require("../controllers/fertilizerTransactionController");

// Record a fertilizer application using a protected PostgreSQL transaction.
router.post(
    "/fertilizer",
    protect,
    recordFertilizerApplication
);

module.exports = router;
