const mongoose = require('mongoose');

const restockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'ordered', 'received'], default: 'pending' },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RestockQueue', restockSchema);
