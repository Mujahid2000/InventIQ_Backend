import type { NextFunction, Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";
import Order from "../models/Order";
import Product from "../models/Product";
import RestockQueue from "../models/RestockQueue";

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

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, customerName } = req.body as {
      items?: Array<{ product: string; quantity: number }>;
      customerName?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error("Items array required"));
    }

    const normalizedItems: OrderItemInput[] = items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity) || 0,
      unitPrice: 0,
    }));

    if (!uniqueProductCheck(normalizedItems)) {
      res.status(400);
      return next(new Error("Duplicate products in order items"));
    }

    const productIds = normalizedItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.product));
      if (!product) {
        res.status(400);
        return next(new Error(`Product not found: ${item.product}`));
      }

      if (!product.active) {
        res.status(400);
        return next(new Error(`Product not active: ${product.name || product._id}`));
      }
    }

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.product));
      const quantity = Number(item.quantity) || 0;

      if (!product || product.stockQuantity < quantity) {
        res.status(400);
        return next(new Error(`Only ${product?.stockQuantity ?? 0} items available for ${product?.name || item.product}`));
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

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("items.product");

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const status = String((req.body as { status?: string }).status || "").toLowerCase() as ProgressStatus;

    const order = await Order.findById(id);
    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    if (!ORDER_PROGRESS.includes(status)) {
      res.status(400);
      return next(new Error("Invalid order status"));
    }

    if (order.status === "cancelled") {
      res.status(400);
      return next(new Error("Cancelled orders cannot be updated"));
    }

    const currentIndex = ORDER_PROGRESS.indexOf(order.status as ProgressStatus);
    const nextIndex = ORDER_PROGRESS.indexOf(status);
    if (nextIndex < currentIndex) {
      res.status(400);
      return next(new Error("Order status cannot move backward"));
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

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    if (order.status === "cancelled") {
      return res.json(order);
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      res.status(400);
      return next(new Error("Only pending or confirmed orders can be cancelled"));
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

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    await order.deleteOne();

    await ActivityLog.create({
      user: req.user?._id,
      action: "delete_order",
      entityType: "Order",
      entityId: order._id,
      details: { totalPrice: order.totalPrice, items: order.items.length },
    });

    res.json({ message: "Order deleted" });
  } catch (err) {
    next(err);
  }
};
