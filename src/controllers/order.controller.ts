import type { Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";
import Order from "../models/Order";
import Product from "../models/Product";
import RestockQueue from "../models/RestockQueue";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

const ORDER_PROGRESS = ["pending", "confirmed", "shipped", "delivered"] as const;

type ProgressStatus = (typeof ORDER_PROGRESS)[number];

interface OrderItemInput {
  product: string;
  quantity: number;
  unitPrice?: number;
}

interface OrderCreatePayload {
  user?: unknown;
  customerName: string;
  items: Array<{ product: string; quantity: number; unitPrice: number }>;
  totalPrice: number;
  status: "confirmed";
}

const uniqueProductCheck = (items: OrderItemInput[]): boolean => {
  const seen = new Set<string>();

  for (const item of items) {
    const id = String(item.product);
    if (seen.has(id)) return false;
    seen.add(id);
  }

  return true;
};

export const create = AsyncHandler(async (req: Request, res: Response) => {
  const { items, customerName } = req.body as {
    items?: Array<{ product: string; quantity: number }>;
    customerName?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Items array required");
  }

  const normalizedItems: OrderItemInput[] = items.map((item) => ({
    product: item.product,
    quantity: Number(item.quantity) || 0,
    unitPrice: 0,
  }));

  if (!uniqueProductCheck(normalizedItems)) {
    throw new ApiError(400, "Duplicate products in order items");
  }

  const productIds = normalizedItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  for (const item of normalizedItems) {
    const product = productMap.get(String(item.product));
    if (!product) {
      throw new ApiError(400, `Product not found: ${item.product}`);
    }

    if (!product.active) {
      throw new ApiError(400, `Product not active: ${product.name || product._id}`);
    }
  }

  for (const item of normalizedItems) {
    const product = productMap.get(String(item.product));
    const quantity = Number(item.quantity) || 0;
    const stockAvailable = product?.stockQuantity ?? 0;

    if (stockAvailable < quantity) {
      throw new ApiError(400, `Only ${stockAvailable} items available for ${product?.name || item.product}`);
    }
  }

  let total = 0;

  for (const item of normalizedItems) {
    const product = productMap.get(String(item.product));
    if (!product) continue;

    const quantity = Number(item.quantity) || 0;
    product.stockQuantity = product.stockQuantity - quantity;
    product.status = product.stockQuantity === 0 ? "Out of Stock" : "In Stock";
    await product.save();

    if (product.stockQuantity < product.minStockThreshold) {
      const exists = await RestockQueue.findOne({ product: product._id, status: "pending" });
      if (!exists) {
        await RestockQueue.create({ product: product._id });
        await ActivityLog.create({
          user: req.user?._id,
          action: `Product "${product.name}" added to Restock Queue (stock: ${product.stockQuantity}, threshold: ${product.minStockThreshold})`,
        });
      }
    }

    total += quantity * (product.price || 0);
    item.unitPrice = product.price || 0;
  }

  const payload: OrderCreatePayload = {
    user: req.user?._id,
    customerName: customerName ? String(customerName).trim() : "Walk-in Customer",
    items: normalizedItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
    })),
    totalPrice: total,
    status: "confirmed",
  };

  const order = await Order.create(payload as any);

  await ActivityLog.create({
    user: req.user?._id,
    action: "create_order",
    entityType: "Order",
    entityId: order._id,
    details: { totalPrice: order.totalPrice, items: order.items.length },
  });

  res.status(201).json(new ApiResponse(201, order, "Order created successfully"));
});

export const getAll = AsyncHandler(async (req: Request, res: Response) => {
  const { status, from, to } = req.query as {
    status?: string;
    from?: string;
    to?: string;
  };

  const filter: {
    status?: string;
    placedAt?: { $gte?: Date; $lte?: Date };
  } = {};

  if (status) {
    filter.status = status;
  }

  if (from || to) {
    filter.placedAt = {};
    if (from) filter.placedAt.$gte = new Date(from);
    if (to) filter.placedAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter).populate("items.product").sort("-createdAt");
  res.json(new ApiResponse(200, orders, "Orders fetched successfully"));
});

export const getOne = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate("items.product");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res.json(new ApiResponse(200, order, "Order fetched successfully"));
});

export const updateStatus = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const status = String((req.body as { status?: string }).status || "").toLowerCase() as ProgressStatus;

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!ORDER_PROGRESS.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  if (order.status === "cancelled") {
    throw new ApiError(400, "Cancelled orders cannot be updated");
  }

  const currentIndex = ORDER_PROGRESS.indexOf(order.status as ProgressStatus);
  const nextIndex = ORDER_PROGRESS.indexOf(status);
  if (nextIndex < currentIndex) {
    throw new ApiError(400, "Order status cannot move backward");
  }

  order.status = status;
  await order.save();

  await ActivityLog.create({
    user: req.user?._id,
    action: "update_order_status",
    entityType: "Order",
    entityId: order._id,
    details: { status },
  });

  res.json(new ApiResponse(200, order, "Order status updated successfully"));
});

export const cancel = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status === "cancelled") {
    return res.json(new ApiResponse(200, order, "Order already cancelled"));
  }

  if (!["pending", "confirmed"].includes(order.status)) {
    throw new ApiError(400, "Only pending or confirmed orders can be cancelled");
  }

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    product.stockQuantity = (product.stockQuantity || 0) + (item.quantity || 0);
    product.status = product.stockQuantity === 0 ? "Out of Stock" : "In Stock";
    await product.save();
  }

  order.status = "cancelled";
  await order.save();

  await ActivityLog.create({
    user: req.user?._id,
    action: "cancel_order",
    entityType: "Order",
    entityId: order._id,
    details: {},
  });

  res.json(new ApiResponse(200, order, "Order cancelled successfully"));
});

export const remove = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  await order.deleteOne();

  await ActivityLog.create({
    user: req.user?._id,
    action: "delete_order",
    entityType: "Order",
    entityId: order._id,
    details: { totalPrice: order.totalPrice, items: order.items.length },
  });

  res.json(new ApiResponse(200, null, "Order deleted"));
});
