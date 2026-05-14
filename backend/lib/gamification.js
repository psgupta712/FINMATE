// All badge definitions
const BADGES = [
  // Streak badges
  { id: 'first_log',       name: 'First Step',       icon: '👣', description: 'Log your first transaction' },
  { id: 'streak_3',        name: 'On a Roll',        icon: '🔥', description: '3-day logging streak' },
  { id: 'streak_7',        name: 'Week Warrior',     icon: '⚡', description: '7-day logging streak' },
  { id: 'streak_14',       name: 'Fortnight Force',  icon: '💪', description: '14-day logging streak' },
  { id: 'streak_30',       name: 'Iron Habit',       icon: '🏆', description: '30-day logging streak' },

  // Savings milestones
  { id: 'saved_500',       name: 'Piggy Bank',       icon: '🐷', description: 'Save ₹500 toward goals' },
  { id: 'saved_5000',      name: 'Money Magnet',     icon: '💰', description: 'Save ₹5,000 toward goals' },
  { id: 'saved_25000',     name: 'Wealth Builder',   icon: '🏦', description: 'Save ₹25,000 toward goals' },
  { id: 'saved_100000',    name: 'Lakh Club',        icon: '💎', description: 'Save ₹1,00,000 toward goals' },

  // Goal milestones
  { id: 'goal_1',          name: 'Goal Getter',      icon: '🎯', description: 'Complete your first goal' },
  { id: 'goal_3',          name: 'Triple Threat',    icon: '🎳', description: 'Complete 3 goals' },
  { id: 'goal_10',         name: 'Goal Machine',     icon: '🚀', description: 'Complete 10 goals' },

  // Level badges
  { id: 'level_5',         name: 'Rising Star',      icon: '⭐', description: 'Reach Level 5' },
  { id: 'level_10',        name: 'Finance Pro',      icon: '🌟', description: 'Reach Level 10' },
  { id: 'level_20',        name: 'Money Master',     icon: '👑', description: 'Reach Level 20' },
];

const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]));

// XP thresholds per level (level N requires XP[N-1] cumulative XP)
const xpForLevel = (level) => Math.floor(100 * Math.pow(1.4, level - 1));

const getLevelFromXP = (xp) => {
  let level = 1;
  let cumulative = 0;
  while (true) {
    cumulative += xpForLevel(level);
    if (xp < cumulative) break;
    level++;
    if (level > 100) break;
  }
  return level;
};

const getXPForNextLevel = (level) => {
  let cumulative = 0;
  for (let i = 1; i <= level; i++) cumulative += xpForLevel(i);
  return cumulative;
};

const getXPForCurrentLevel = (level) => {
  let cumulative = 0;
  for (let i = 1; i < level; i++) cumulative += xpForLevel(i);
  return cumulative;
};

/**
 * Evaluate which new badges should be awarded and add XP.
 * Mutates the streak document and returns newly earned badges.
 */
const evaluateBadges = (streak, { isFirstLog = false } = {}) => {
  const newBadges = [];
  const existing = new Set(streak.badges.map(b => b.id));

  const maybeAward = (id) => {
    if (!existing.has(id) && BADGE_MAP[id]) {
      const badge = { ...BADGE_MAP[id], unlockedAt: new Date() };
      streak.badges.push(badge);
      existing.add(id);
      newBadges.push(badge);
      streak.xp += 50; // flat XP per badge
    }
  };

  if (isFirstLog) maybeAward('first_log');

  // Streak badges
  if (streak.currentStreak >= 3)  maybeAward('streak_3');
  if (streak.currentStreak >= 7)  maybeAward('streak_7');
  if (streak.currentStreak >= 14) maybeAward('streak_14');
  if (streak.currentStreak >= 30) maybeAward('streak_30');

  // Savings badges
  if (streak.totalSaved >= 500)    maybeAward('saved_500');
  if (streak.totalSaved >= 5000)   maybeAward('saved_5000');
  if (streak.totalSaved >= 25000)  maybeAward('saved_25000');
  if (streak.totalSaved >= 100000) maybeAward('saved_100000');

  // Goal badges
  if (streak.goalsCompleted >= 1)  maybeAward('goal_1');
  if (streak.goalsCompleted >= 3)  maybeAward('goal_3');
  if (streak.goalsCompleted >= 10) maybeAward('goal_10');

  // Recalculate level
  streak.level = getLevelFromXP(streak.xp);

  // Level badges
  if (streak.level >= 5)  maybeAward('level_5');
  if (streak.level >= 10) maybeAward('level_10');
  if (streak.level >= 20) maybeAward('level_20');

  return newBadges;
};

/**
 * Call whenever a user logs a transaction.
 * Updates streak counters and awards badges.
 * Returns { newBadges, xpGained, streak }
 */
const processTransactionLog = async (streak, xpAmount = 10) => {
  const today = new Date().toISOString().split('T')[0];
  const isFirstLog = streak.logDates.length === 0;

  if (!streak.logDates.includes(today)) {
    streak.logDates.push(today);
    streak.xp += xpAmount;

    // Compute streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (!streak.lastLoggedDate) {
      streak.currentStreak = 1;
    } else {
      const lastStr = new Date(streak.lastLoggedDate).toISOString().split('T')[0];
      if (lastStr === yStr) {
        streak.currentStreak += 1;
      } else if (lastStr === today) {
        // already logged today, no change
      } else {
        streak.currentStreak = 1; // streak broken
      }
    }
    streak.lastLoggedDate = new Date();
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }
  }

  const newBadges = evaluateBadges(streak, { isFirstLog });
  await streak.save();
  return { newBadges, streak };
};

module.exports = {
  BADGES,
  BADGE_MAP,
  getLevelFromXP,
  getXPForNextLevel,
  getXPForCurrentLevel,
  xpForLevel,
  evaluateBadges,
  processTransactionLog,
};