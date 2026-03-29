const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    minStockThreshold: { type: Number, default: 0 },
    status: { type: String, enum: ['In Stock', 'Out of Stock'], default: 'In Stock' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
