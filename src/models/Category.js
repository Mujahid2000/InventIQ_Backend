const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    iconColor: { type: String, default: '#6366F1' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
