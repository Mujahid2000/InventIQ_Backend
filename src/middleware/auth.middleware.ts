import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User";

interface AuthTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: "admin" | "manager";
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401);
      return next(new Error("No token provided"));
    }

    const token = authHeader.split(" ")[1];

    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "changeme") as AuthTokenPayload;
    } catch (_err) {
      res.status(401);
      return next(new Error("Token invalid"));
    }

    const user = await User.findById(decoded.id).select("-password").lean();
    if (!user) {
      res.status(401);
      return next(new Error("User not found"));
    }

    req.user = {
      _id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...roles: Array<"admin" | "manager">) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

export default authMiddleware;
