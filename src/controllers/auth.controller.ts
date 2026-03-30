import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { type IUser } from "../models/User";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsyncHandler from "../utils/AsyncHandler";

interface JwtUserPayload {
  _id: unknown;
  email: string;
  role: IUser["role"];
}

const generateToken = (user: JwtUserPayload): string => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "changeme",
    { expiresIn: "7d" },
  );
};

export const signup = AsyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  const exists = await User.findOne({ email });
  if (exists) {
    throw new ApiError(400, "User already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  const user = await User.create({ name, email, password: hashed });
  const token = generateToken(user);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
      "Signup successful",
    ),
  );
});

export const login = AsyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { demo?: boolean; email?: string; password?: string };

  if (body.demo) {
    const demoEmail = "demo@test.com";
    const demoPass = "demo123";

    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(demoPass, salt);
      demoUser = await User.create({ name: "Demo User", email: demoEmail, password: hashed });
    }

    const token = generateToken(demoUser);
    return res.json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            id: demoUser._id,
            name: demoUser.name,
            email: demoUser.email,
            role: demoUser.role,
          },
        },
        "Login successful",
      ),
    );
  }

  const { email, password } = body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(user);

  res.json(
    new ApiResponse(
      200,
      {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
      "Login successful",
    ),
  );
});
