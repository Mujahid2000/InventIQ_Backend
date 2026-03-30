import type { Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Product, { type IProduct } from "../models/Product";
import RestockQueue from "../models/RestockQueue";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

const priorityFor = (product: Pick<IProduct, "stockQuantity" | "minStockThreshold">): "High" | "Medium" | "Low" => {
  const stock = product.stockQuantity || 0;
  const threshold = product.minStockThreshold || 0;

  if (stock === 0) return "High";
  if (threshold > 0 && stock <= threshold / 2) return "Medium";
  return "Low";
};

export const getAll = AsyncHandler(async (_req: Request, res: Response) => {
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
  res.json(new ApiResponse(200, mapped, "Restock queue fetched successfully"));
});

export const update = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body as { amount?: number };

  if (amount == null) {
    throw new ApiError(400, "Amount is required");
  }

  const queueItem = await RestockQueue.findById(id).populate("product");
  if (!queueItem) {
    throw new ApiError(404, "Restock item not found");
  }

  const product = queueItem.product as unknown as HydratedDocument<IProduct> | null;
  if (!product) {
    throw new ApiError(404, "Product not found for restock item");
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

  res.json(new ApiResponse(200, { queueItem, product }, "Restock updated successfully"));
});

export const remove = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const queueItem = await RestockQueue.findById(id);

  if (!queueItem) {
    throw new ApiError(404, "Restock item not found");
  }

  await queueItem.deleteOne();

  await ActivityLog.create({
    user: req.user?._id,
    action: "remove_restock_item",
    entityType: "RestockQueue",
    entityId: queueItem._id,
    details: {},
  });

  res.json(new ApiResponse(200, null, "Removed"));
});
