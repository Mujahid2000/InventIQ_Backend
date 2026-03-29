import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Product, { type IProduct } from "../models/Product";
import RestockQueue from "../models/RestockQueue";

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate("category");

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};

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

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body as Partial<IProduct>;

    let product = await Product.findById(id);
    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
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

    res.json(product);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      res.status(404);
      return next(new Error("Product not found"));
    }

    await product.deleteOne();

    await ActivityLog.create({
      user: req.user?._id,
      action: "delete_product",
      entityType: "Product",
      entityId: product._id,
      details: { name: product.name },
    });

    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};
