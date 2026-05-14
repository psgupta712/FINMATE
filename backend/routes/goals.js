const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Goal = require('../models/Goal');

const FREE_GOAL_LIMIT = 3;

router.post('/', protect, async (req, res) => {
  try {
    // 🔒 Enforce goal limit for free users
    if (req.user.plan !== 'premium') {
      const count = await Goal.countDocuments({ user: req.user._id, isCompleted: false });
      if (count >= FREE_GOAL_LIMIT) {
        return res.status(403).json({
          success: false,
          message: `Free plan allows only ${FREE_GOAL_LIMIT} active goals. Upgrade to Premium for unlimited goals!`,
          upgradeRequired: true,
        });
      }
    }

    const goal = await Goal.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, goals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/goals/:id/add-savings
router.patch('/:id/add-savings', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    goal.savedAmount = Math.min(goal.savedAmount + amount, goal.targetAmount);
    if (goal.savedAmount >= goal.targetAmount) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }
    await goal.save();
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;