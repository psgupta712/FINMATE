const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Streak = require('../models/Streak');
const {
  BADGES,
  getLevelFromXP,
  getXPForNextLevel,
  getXPForCurrentLevel,
} = require('../lib/gamification');

// Helper: get or create streak doc for user
const getOrCreateStreak = async (userId) => {
  let streak = await Streak.findOne({ user: userId });
  if (!streak) streak = await Streak.create({ user: userId });
  return streak;
};

// GET /api/streaks/me  — full profile
router.get('/me', protect, async (req, res) => {
  try {
    const streak = await getOrCreateStreak(req.user._id);

    const level = getLevelFromXP(streak.xp);
    const xpStart = getXPForCurrentLevel(level);
    const xpEnd   = getXPForNextLevel(level);
    const xpProgress = streak.xp - xpStart;
    const xpNeeded  = xpEnd - xpStart;

    // Build full badge list with locked/unlocked state
    const earnedIds = new Set(streak.badges.map(b => b.id));
    const allBadges = BADGES.map(b => ({
      ...b,
      unlocked: earnedIds.has(b.id),
      unlockedAt: streak.badges.find(eb => eb.id === b.id)?.unlockedAt || null,
    }));

    res.json({
      success: true,
      streak: {
        currentStreak:  streak.currentStreak,
        longestStreak:  streak.longestStreak,
        lastLoggedDate: streak.lastLoggedDate,
        totalSaved:     streak.totalSaved,
        goalsCompleted: streak.goalsCompleted,
        xp:             streak.xp,
        level,
        xpProgress,
        xpNeeded,
        logDates:       streak.logDates,
        badges:         streak.badges,
      },
      allBadges,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/streaks/leaderboard  (top 10 by XP among all users — fun social feature)
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const top = await Streak.find()
      .sort({ xp: -1 })
      .limit(10)
      .populate('user', 'name');

    res.json({
      success: true,
      leaderboard: top.map((s, i) => ({
        rank: i + 1,
        name: s.user?.name || 'Unknown',
        xp: s.xp,
        level: getLevelFromXP(s.xp),
        currentStreak: s.currentStreak,
        badgeCount: s.badges.length,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;