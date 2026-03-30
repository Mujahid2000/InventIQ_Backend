import type { Request, Response } from "express";
import Order from "../models/Order";
import Product from "../models/Product";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

export const stats = AsyncHandler(async (_req: Request, res: Response) => {
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

  res.json(
    new ApiResponse(
      200,
      {
        totalOrdersToday,
        pendingOrders,
        completedOrders,
        lowStockCount,
        revenueToday,
        recentProducts,
      },
      "Dashboard stats fetched successfully",
    ),
  );
});
