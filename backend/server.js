// 🔥 DNS FIX (must be at top)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// ✅ Load .env FIRST — before any validation that reads process.env
require('dotenv').config();

// ✅ ENV VALIDATION — now process.env is populated from .env
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

const app = express();

app.use(helmet());
app.use(morgan('dev'));

// ✅ CORS: allow the main CLIENT_URL plus Vercel preview URLs for the same project.
// Set VERCEL_PROJECT_NAME in your backend env to match your Vercel project name,
// e.g. "finbot" → allows https://finbot-*.vercel.app previews automatically.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
];

// Optionally allow all Vercel preview deployments for a project
if (process.env.VERCEL_PROJECT_NAME) {
  // This regex matches: https://finbot-abc123-yourteam.vercel.app
  allowedOrigins.push(new RegExp(`^https://${process.env.VERCEL_PROJECT_NAME}[\\w-]*\\.vercel\\.app$`));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Razorpay webhooks)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
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