const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  amount: { type: Number, required: true }, // in paise
  amountInRupees: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },
  purpose: { type: String, enum: ['wallet_topup', 'subscription'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
