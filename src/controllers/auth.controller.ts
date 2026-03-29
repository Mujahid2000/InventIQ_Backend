import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { type IUser } from "../models/User";

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

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400);
      return next(new Error("Email and password required"));
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      return next(new Error("User already exists"));
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashed });
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      return res.json({
        token,
        user: {
          id: demoUser._id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
        },
      });
    }

    const { email, password } = body;
    if (!email || !password) {
      res.status(400);
      return next(new Error("Email and password required"));
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      return next(new Error("Invalid credentials"));
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401);
      return next(new Error("Invalid credentials"));
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};
