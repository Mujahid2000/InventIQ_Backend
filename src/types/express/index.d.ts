import type { Types } from "mongoose";
import type { UserRole } from "../../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId | string;
        role: UserRole;
        name?: string;
        email?: string;
      };
    }
  }
}

export {};
