import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Product, { type IProduct } from "../models/Product";
import RestockQueue from "../models/RestockQueue";

const priorityFor = (product: Pick<IProduct, "stockQuantity" | "minStockThreshold">): "High" | "Medium" | "Low" => {
  const stock = product.stockQuantity || 0;
  const threshold = product.minStockThreshold || 0;

  if (stock === 0) return "High";
  if (threshold > 0 && stock <= threshold / 2) return "Medium";
  return "Low";
};

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await RestockQueue.find()
      .populate({
        path: "product",
        populate: { path: "category", select: "name" },
      })
      .lean();

    const mapped = items.map((item) => {
      const product = (item.product || {}) as Partial<IProduct>;

      return {
        _id: item._id,
        product,
        currentStock: product.stockQuantity || 0,
        minStockThreshold: product.minStockThreshold || 0,
        priority: priorityFor({
          stockQuantity: product.stockQuantity || 0,
          minStockThreshold: product.minStockThreshold || 0,
        }),
        status: item.status,
        requestedAt: item.requestedAt,
      };
    });

    mapped.sort((a, b) => a.currentStock - b.currentStock);
    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount } = req.body as { amount?: number };

    if (amount == null) {
      res.status(400);
      return next(new Error("Amount is required"));
    }

    const queueItem = await RestockQueue.findById(id).populate("product");
    if (!queueItem) {
      res.status(404);
      return next(new Error("Restock item not found"));
    }

    const product = queueItem.product as unknown as HydratedDocument<IProduct> | null;
    if (!product) {
      res.status(404);
      return next(new Error("Product not found for restock item"));
    }

    product.stockQuantity = (product.stockQuantity || 0) + Number(amount);
    product.active = true;
    product.status = product.stockQuantity > 0 ? "In Stock" : "Out of Stock";
    await product.save();

    queueItem.status = "received";
    queueItem.note = `Restocked ${amount} manually`;
    await queueItem.save();

    await ActivityLog.create({
      user: req.user?._id,
      action: "restock_manual",
      entityType: "RestockQueue",
      entityId: queueItem._id,
      details: { product: product._id, amount },
    });

    res.json({ queueItem, product });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const queueItem = await RestockQueue.findById(id);

    if (!queueItem) {
      res.status(404);
      return next(new Error("Restock item not found"));
    }

    await queueItem.deleteOne();

    await ActivityLog.create({
      user: req.user?._id,
      action: "remove_restock_item",
      entityType: "RestockQueue",
      entityId: queueItem._id,
      details: {},
    });

    res.json({ message: "Removed" });
  } catch (err) {
    next(err);
  }
};
