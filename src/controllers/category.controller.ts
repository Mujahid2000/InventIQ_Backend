import type { Request, Response } from "express";
import type { Types } from "mongoose";
import ActivityLog from "../models/ActivityLog";
import Category from "../models/Category";
import Product from "../models/Product";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

export const getAll = AsyncHandler(async (_req: Request, res: Response) => {
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

  res.json(new ApiResponse(200, enriched, "Categories fetched successfully"));
});

export const create = AsyncHandler(async (req: Request, res: Response) => {
  const { name, description, iconColor } = req.body as {
    name?: string;
    description?: string;
    iconColor?: string;
  };

  if (!name) {
    throw new ApiError(400, "Name is required");
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

  res.status(201).json(new ApiResponse(201, category, "Category created successfully"));
});

export const update = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, iconColor } = req.body as {
    name?: string;
    description?: string;
    iconColor?: string;
  };

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
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

  res.json(new ApiResponse(200, category, "Category updated successfully"));
});

export const remove = AsyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await category.deleteOne();

  await ActivityLog.create({
    user: req.user?._id,
    action: "delete_category",
    entityType: "Category",
    entityId: category._id,
    details: { name: category.name },
  });

  res.json(new ApiResponse(200, null, "Category deleted"));
});
