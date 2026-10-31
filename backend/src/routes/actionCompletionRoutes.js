
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  completeAction,
  getActionCompletionHistory,
  updateActionCompletion,
  deleteActionCompletion,
} = require("../controllers/actionCompletionController");

// Mark a farm action as completed
router.post("/:farmId", protect, completeAction);

// Retrieve completed actions for a farm
router.get("/:farmId", protect, getActionCompletionHistory);

// Update an existing completed action
router.patch(
  "/:farmId/:completionId",
  protect,
  updateActionCompletion
);

// Delete an existing completed action
router.delete(
  "/:farmId/:completionId",
  protect,
  deleteActionCompletion
);

module.exports = router;