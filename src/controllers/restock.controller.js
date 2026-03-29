const RestockQueue = require('../models/RestockQueue');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');

function priorityFor(product) {
  const stock = product.stockQuantity || 0;
  const threshold = product.minStockThreshold || 0;
  if (stock === 0) return 'High';
  if (threshold > 0 && stock <= threshold / 2) return 'Medium';
  return 'Low';
}

exports.getAll = async (req, res, next) => {
  try {
    const items = await RestockQueue.find().populate({
      path: 'product',
      populate: { path: 'category', select: 'name' },
    });
    const mapped = items.map((it) => {
      const p = it.product || {};
      return {
        _id: it._id,
        product: p,
        currentStock: p.stockQuantity || 0,
        minStockThreshold: p.minStockThreshold || 0,
        priority: priorityFor(p),
        status: it.status,
        requestedAt: it.requestedAt,
      };
    });

    mapped.sort((a, b) => a.currentStock - b.currentStock);
    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (amount == null) {
      res.status(400);
      return next(new Error('Amount is required'));
    }

    const queueItem = await RestockQueue.findById(id).populate('product');
    if (!queueItem) {
      res.status(404);
      return next(new Error('Restock item not found'));
    }

    const product = queueItem.product;
    product.stockQuantity = (product.stockQuantity || 0) + Number(amount);
    product.active = true;
    product.status = product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock';
    await product.save();

    queueItem.status = 'received';
    queueItem.note = `Restocked ${amount} manually`;
    await queueItem.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'restock_manual',
      entityType: 'RestockQueue',
      entityId: queueItem._id,
      details: { product: product._id, amount },
    });

    res.json({ queueItem, product });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const q = await RestockQueue.findById(id);
    if (!q) {
      res.status(404);
      return next(new Error('Restock item not found'));
    }
    await q.remove();
    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'remove_restock_item',
      entityType: 'RestockQueue',
      entityId: q._id,
      details: {},
    });
    res.json({ message: 'Removed' });
  } catch (err) {
    next(err);
  }
};
