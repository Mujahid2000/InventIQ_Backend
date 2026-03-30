import type { Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Product, { type IProduct } from "../models/Product";
import RestockQueue from "../models/RestockQueue";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

export const getAll = AsyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.find().populate("category");
  res.json(new ApiResponse(200, products, "Products fetched successfully"));
});

export const getOne = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("category");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.json(new ApiResponse(200, product, "Product fetched successfully"));
});

const postSaveChecks = async (product: HydratedDocument<IProduct>, req: Request): Promise<void> => {
  if (product.stockQuantity === 0) {
    product.status = "Out of Stock";
  } else {
    product.status = "In Stock";
  }

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
};

export const create = AsyncHandler(async (req: Request, res: Response) => {
  const data = req.body as Partial<IProduct>;
  let product = new Product(data);

  await postSaveChecks(product, req);
  product = await product.save();

  await ActivityLog.create({
    user: req.user?._id,
    action: "create_product",
    entityType: "Product",
    entityId: product._id,
    details: { name: product.name },
  });

  res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

export const update = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body as Partial<IProduct>;

  let product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  Object.assign(product, data);

  await postSaveChecks(product, req);
  product = await product.save();

  await ActivityLog.create({
    user: req.user?._id,
    action: "update_product",
    entityType: "Product",
    entityId: product._id,
    details: { name: product.name },
  });

  res.json(new ApiResponse(200, product, "Product updated successfully"));
});

export const remove = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await product.deleteOne();

  await ActivityLog.create({
    user: req.user?._id,
    action: "delete_product",
    entityType: "Product",
    entityId: product._id,
    details: { name: product.name },
  });

  res.json(new ApiResponse(200, null, "Product deleted"));
});
