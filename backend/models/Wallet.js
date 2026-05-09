const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  balanceAfter: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: [walletTransactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
