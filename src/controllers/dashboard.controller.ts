import type { NextFunction, Request, Response } from "express";
import Order from "../models/Order";
import Product from "../models/Product";

export const stats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalOrdersToday = await Order.countDocuments({ placedAt: { $gte: startOfDay } });
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const completedOrders = await Order.countDocuments({ status: "delivered" });

    const lowStockCount = await Product.countDocuments({
      $expr: { $lt: ["$stockQuantity", "$minStockThreshold"] },
    });

    const revenueAggregate = await Order.aggregate<{ _id: null; total: number }>([
      { $match: { status: "delivered", placedAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    const revenueToday = (revenueAggregate[0] && revenueAggregate[0].total) || 0;

    const recentProducts = await Product.find()
      .sort("-updatedAt")
      .limit(5)
      .select("name stockQuantity minStockThreshold status");

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
