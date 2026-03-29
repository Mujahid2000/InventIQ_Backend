import type { NextFunction, Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";

export const getLatest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(Number((req.query as { limit?: string }).limit) || 10, 1), 100);
    const page = Math.max(Number((req.query as { page?: string }).page) || 1, 1);
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("user", "name email");

    res.json(logs);
  } catch (err) {
    next(err);
  }
};
