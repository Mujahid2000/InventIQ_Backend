import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db";
import swaggerSpec from "./config/swagger";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import logsRoutes from "./routes/logs.routes";
import orderRoutes from "./routes/order.routes";
import productRoutes from "./routes/product.routes";
import restockRoutes from "./routes/restock.routes";

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

  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    // Keep docs/health available even if DB is temporarily unavailable.
    if (req.path === "/" || req.path.startsWith("/api/docs")) {
      return next();
    }

    try {
      await ensureDbConnection();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/docs", (_req: Request, res: Response) => {
    res.redirect(302, "/api/docs/");
  });

  app.use("/api/docs/", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/restock", restockRoutes);
  app.use("/api/logs", logsRoutes);

  app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "API is running", docs: "/api/docs/" });
  });

  app.use(errorHandler);

  return app;
}
