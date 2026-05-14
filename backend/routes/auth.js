const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');

// Simple in-memory rate limiter (no extra package needed)
// For production at scale, replace with express-rate-limit + Redis
const rateLimitStore = new Map();
const rateLimit = (windowMs, maxRequests) => (req, res, next) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  rateLimitStore.set(key, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  }
  next();
};

// Clean up old entries every 15 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 15 * 60 * 1000);

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/signup  (rate limited: 10 signups per 15min per IP)
router.post('/signup',
  rateLimit(15 * 60 * 1000, 10),
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, email, password, college } = req.body;
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

      const user = await User.create({ name, email, password, college });

      // Create wallet & free subscription
      await Wallet.create({ user: user._id });
      await Subscription.create({ user: user._id, plan: 'free', status: 'active' });

      const token = generateToken(user._id);
      res.status(201).json({ success: true, token, user });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/login  (rate limited: 20 attempts per 15min per IP)
router.post('/login',
  rateLimit(15 * 60 * 1000, 20),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      const token = generateToken(user._id);
      res.json({ success: true, token, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PATCH /api/auth/profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'college', 'monthlyBudget', 'currency', 'avatar'];
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;