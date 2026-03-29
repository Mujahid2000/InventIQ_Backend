import { Schema, model } from "mongoose";

export type UserRole = "admin" | "manager";

export interface IUser {
  name?: string;
  email: string;
  password: string;
  role: UserRole;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager"], default: "manager" },
  },
  { timestamps: true },
);

const User = model<IUser>("User", userSchema);

export default User;
