const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  savedAmount: { type: Number, default: 0 },
  deadline: { type: Date, required: true },
  category: {
    type: String,
    enum: ['Emergency Fund', 'Laptop', 'Trip', 'Course', 'Gadget', 'Books', 'Other'],
    default: 'Other',
  },
  icon: { type: String, default: '🎯' },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
