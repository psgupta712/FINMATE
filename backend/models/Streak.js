const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  unlockedAt: { type: Date, default: Date.now },
});

const streakSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Daily logging streak
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastLoggedDate: { type: Date, default: null }, // date of last transaction log

  // Savings milestones
  totalSaved: { type: Number, default: 0 },       // lifetime savings deposited into goals
  goalsCompleted: { type: Number, default: 0 },

  // XP / level system
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  // Badges earned
  badges: [badgeSchema],

  // Daily log calendar — array of date strings 'YYYY-MM-DD'
  logDates: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Streak', streakSchema);