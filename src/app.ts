import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
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

  app.get("/api/docs/swagger.json", (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #0b1020; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '/api/docs/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;

  app.get("/api/docs", (_req: Request, res: Response) => {
    res.type("html").send(swaggerHtml);
  });

  app.get("/api/docs/", (_req: Request, res: Response) => {
    res.type("html").send(swaggerHtml);
  });

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
