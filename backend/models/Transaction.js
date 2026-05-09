const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: [
      'Food & Dining', 'Transport', 'Education', 'Entertainment',
      'Shopping', 'Health', 'Utilities', 'Rent', 'Subscription',
      'Investment', 'Freelance', 'Scholarship', 'Part-time Job',
      'Family Support', 'Refund', 'Other'
    ],
    default: 'Other',
  },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: String, enum: ['daily', 'weekly', 'monthly', null], default: null },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'wallet', 'netbanking', 'other'], default: 'other' },
  tags: [String],
  attachmentUrl: { type: String, default: '' },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
