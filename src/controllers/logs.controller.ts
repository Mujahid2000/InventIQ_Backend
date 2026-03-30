import type { Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

export const getLatest = AsyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number((req.query as { limit?: string }).limit) || 10, 1), 100);
  const page = Math.max(Number((req.query as { page?: string }).page) || 1, 1);
  const skip = (page - 1) * limit;

  const logs = await ActivityLog.find()
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .populate("user", "name email");

  res.json(new ApiResponse(200, logs, "Activity logs fetched successfully"));
});
