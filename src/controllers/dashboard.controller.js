const Order = require('../models/Order');
const Product = require('../models/Product');

exports.stats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalOrdersToday = await Order.countDocuments({ placedAt: { $gte: startOfDay } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });

    // Low stock items count (stockQuantity < minStockThreshold)
    const lowStockCount = await Product.countDocuments({ $expr: { $lt: ['$stockQuantity', '$minStockThreshold'] } });

    // Revenue today: sum totalPrice of delivered orders placed today
    const revenueAgg = await Order.aggregate([
      { $match: { status: 'delivered', placedAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const revenueToday = (revenueAgg[0] && revenueAgg[0].total) || 0;

    const recentProducts = await Product.find()
      .sort('-updatedAt')
      .limit(5)
      .select('name stockQuantity minStockThreshold status');

    res.json({
      totalOrdersToday,
      pendingOrders,
      completedOrders,
      lowStockCount,
      revenueToday,
      recentProducts,
    });
  } catch (err) {
    next(err);
  }
};
