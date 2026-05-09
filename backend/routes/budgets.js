const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Budget = require('../models/Budget');

// POST /api/budgets - Create/update budget
router.post('/', protect, async (req, res) => {
  try {
    const { month, year, totalBudget, categories } = req.body;
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, month, year },
      { totalBudget, categories },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/budgets - Get budget for a month
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;
    const budget = await Budget.findOne({ user: req.user._id, month: Number(month), year: Number(year) });
    res.json({ success: true, budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
