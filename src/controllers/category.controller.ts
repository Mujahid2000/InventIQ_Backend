import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Category from "../models/Category";
import Product from "../models/Product";

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [categories, groupedCounts] = await Promise.all([
      Category.find().sort("name").lean(),
      Product.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(groupedCounts.map((item) => [String(item._id), item.count]));

    const enriched = categories.map((category) => ({
      ...category,
      productCount: countMap.get(String(category._id)) || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, iconColor } = req.body as {
      name?: string;
      description?: string;
      iconColor?: string;
    };

    if (!name) {
      res.status(400);
      return next(new Error("Name is required"));
    }

    const category = await Category.create({
      name,
      description,
      iconColor,
    });

    await ActivityLog.create({
      user: req.user?._id,
      action: "create_category",
      entityType: "Category",
      entityId: category._id,
      details: { name: category.name },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, iconColor } = req.body as {
      name?: string;
      description?: string;
      iconColor?: string;
    };

    const category = await Category.findById(id);
    if (!category) {
      res.status(404);
      return next(new Error("Category not found"));
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (iconColor !== undefined) category.iconColor = iconColor;

    await category.save();

    await ActivityLog.create({
      user: req.user?._id,
      action: "update_category",
      entityType: "Category",
      entityId: category._id,
      details: { name: category.name },
    });

    res.json(category);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      res.status(404);
      return next(new Error("Category not found"));
    }

    await category.deleteOne();

    await ActivityLog.create({
      user: req.user?._id,
      action: "delete_category",
      entityType: "Category",
      entityId: category._id,
      details: { name: category.name },
    });

    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};
