import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import ApiError from "../utils/ApiError";
import AsyncHandler from "../utils/AsyncHandler";

interface AuthTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: "admin" | "manager";
}

const authMiddleware = AsyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "No token provided");
  }

  const token = authHeader.split(" ")[1];

  let decoded: AuthTokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "changeme") as AuthTokenPayload;
  } catch (_err) {
    throw new ApiError(401, "Token invalid");
  }

  const user = await User.findById(decoded.id).select("-password").lean();
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = {
    _id: user._id,
    role: user.role,
    name: user.name,
    email: user.email,
  };

  next();
});

export const requireRole = (...roles: Array<"admin" | "manager">) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Access denied. Insufficient permissions."));
    }

    next();
  };
};

export default authMiddleware;
