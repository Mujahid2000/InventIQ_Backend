import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db";
import swaggerSpec from "./config/swagger";

const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const restockRoutes = require("./routes/restock.routes");
const logsRoutes = require("./routes/logs.routes");

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

let dbReadyPromise: Promise<void> | undefined;

export function ensureDbConnection(): Promise<void> {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDB().catch((err) => {
      dbReadyPromise = undefined;
      throw err;
    });
  }

  return dbReadyPromise;
}

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV === "development") {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      await ensureDbConnection();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/restock", restockRoutes);
  app.use("/api/logs", logsRoutes);

  app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "API is running", docs: "/api/docs" });
  });

  app.use(errorHandler);

  return app;
}
