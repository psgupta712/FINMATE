const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  totalBudget: { type: Number, required: true },
  categories: [{
    name: { type: String, required: true },
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 },
  }],
  notes: { type: String, default: '' },
}, { timestamps: true });

budgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
