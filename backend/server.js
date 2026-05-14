// 🔥 DNS FIX (must be at top)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// ✅ ENV VALIDATION — fail fast before anything loads
const REQUIRED_ENV = [
  'MONGO_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'GROQ_API_KEY',
  'CLIENT_URL',
];

const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(k => console.error(`   - ${k}`));
  console.error('\n👉 Copy backend/.env.example to backend/.env and fill in all values.');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// 💳 Razorpay webhook (raw body BEFORE json parser)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/budgets',       require('./routes/budgets'));
app.use('/api/goals',         require('./routes/goals'));
app.use('/api/wallet',        require('./routes/wallet'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/chatbot',       require('./routes/chatbot'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/receipt',       require('./routes/receipt'));
app.use('/api/streaks',       require('./routes/streaks'));
app.use('/api/export',        require('./routes/export'));
app.use('/api/alerts',        require('./routes/alerts'));

// ❤️ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ❌ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Catch unhandled promise rejections — don't silently swallow them
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();
module.exports = app;