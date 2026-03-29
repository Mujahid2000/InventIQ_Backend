const Order = require('../models/Order');
const Product = require('../models/Product');
const RestockQueue = require('../models/RestockQueue');
const ActivityLog = require('../models/ActivityLog');

const ORDER_PROGRESS = ['pending', 'confirmed', 'shipped', 'delivered'];

function uniqueProductCheck(items) {
  const seen = new Set();
  for (const it of items) {
    const id = String(it.product);
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

exports.create = async (req, res, next) => {
  try {
    const { items, customerName } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('Items array required'));
    }

    if (!uniqueProductCheck(items)) {
      res.status(400);
      return next(new Error('Duplicate products in order items'));
    }

    // Fetch products
    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const prodMap = new Map(products.map((p) => [String(p._id), p]));

    // Validate all products present and active
    for (const it of items) {
      const p = prodMap.get(String(it.product));
      if (!p) {
        res.status(400);
        return next(new Error(`Product not found: ${it.product}`));
      }
      if (!p.active) {
        res.status(400);
        return next(new Error(`Product not active: ${p.name || p._id}`));
      }
    }

    // Check stock
    for (const it of items) {
      const p = prodMap.get(String(it.product));
      const qty = Number(it.quantity) || 0;
      if (p.stockQuantity < qty) {
        res.status(400);
        return next(new Error(`Only ${p.stockQuantity} items available for ${p.name || p._id}`));
      }
    }

    // Deduct stock and calculate total
    let total = 0;
    for (const it of items) {
      const p = prodMap.get(String(it.product));
      const qty = Number(it.quantity) || 0;
      p.stockQuantity = p.stockQuantity - qty;
      if (p.stockQuantity === 0) p.status = 'Out of Stock';
      else p.status = 'In Stock';
      await p.save();

      if (p.stockQuantity < p.minStockThreshold) {
        const exists = await RestockQueue.findOne({ product: p._id, status: 'pending' });
        if (!exists) {
          const product = p;
          await RestockQueue.create({ product: p._id });
          await ActivityLog.create({
            action: `Product "${product.name}" added to Restock Queue (stock: ${product.stockQuantity}, threshold: ${product.minStockThreshold})`,
            performedBy: req.user._id
          });
        }
      }

      total += qty * (p.price || 0);
      it.unitPrice = p.price || 0;
    }

    const order = await Order.create({
      user: req.user ? req.user._id : undefined,
      customerName: customerName ? String(customerName).trim() : 'Walk-in Customer',
      items,
      totalPrice: total,
      status: 'confirmed',
    });

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'create_order',
      entityType: 'Order',
      entityId: order._id,
      details: { totalPrice: order.totalPrice, items: order.items.length },
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { status, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) filter.placedAt = {};
    if (from) filter.placedAt.$gte = new Date(from);
    if (to) filter.placedAt.$lte = new Date(to);

    const orders = await Order.find(filter).populate('items.product').sort('-createdAt');
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.product');
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body.status || '').toLowerCase();
    const order = await Order.findById(id);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (!ORDER_PROGRESS.includes(status)) {
      res.status(400);
      return next(new Error('Invalid order status'));
    }

    if (order.status === 'cancelled') {
      res.status(400);
      return next(new Error('Cancelled orders cannot be updated'));
    }

    const currentIndex = ORDER_PROGRESS.indexOf(order.status);
    const nextIndex = ORDER_PROGRESS.indexOf(status);
    if (nextIndex < currentIndex) {
      res.status(400);
      return next(new Error('Order status cannot move backward'));
    }

    order.status = status;
    await order.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'update_order_status',
      entityType: 'Order',
      entityId: order._id,
      details: { status },
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (order.status === 'cancelled') {
      return res.json(order);
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      res.status(400);
      return next(new Error('Only pending or confirmed orders can be cancelled'));
    }

    // Restore stock
    for (const it of order.items) {
      const p = await Product.findById(it.product);
      if (!p) continue;
      p.stockQuantity = (p.stockQuantity || 0) + (it.quantity || 0);
      if (p.stockQuantity === 0) p.status = 'Out of Stock';
      else p.status = 'In Stock';
      await p.save();
    }

    order.status = 'cancelled';
    await order.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'cancel_order',
      entityType: 'Order',
      entityId: order._id,
      details: { },
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    await order.deleteOne();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'delete_order',
      entityType: 'Order',
      entityId: order._id,
      details: { totalPrice: order.totalPrice, items: order.items.length },
    });

    res.json({ message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
};
