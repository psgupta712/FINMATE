const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  autoRenew: { type: Boolean, default: false },
  amount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
