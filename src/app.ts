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
      :root {
        color-scheme: dark;
      }

      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: radial-gradient(circle at top left, #111b37 0%, #0b1020 48%, #070b16 100%);
      }

      body {
        font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      #swagger-ui {
        max-width: 1200px;
        margin: 0 auto;
      }

      .swagger-ui {
        color: #e2e8f0;
      }

      .swagger-ui .wrapper {
        padding: 0 16px;
      }

      .swagger-ui .info {
        margin: 32px 0 18px;
      }

      .swagger-ui .info .title,
      .swagger-ui .info p,
      .swagger-ui .info li,
      .swagger-ui .opblock-tag,
      .swagger-ui .tab li,
      .swagger-ui .parameter__name,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_links,
      .swagger-ui .response-col_description,
      .swagger-ui .model-title,
      .swagger-ui .model,
      .swagger-ui .prop-type,
      .swagger-ui .prop-format {
        color: #e2e8f0;
      }

      .swagger-ui .info a,
      .swagger-ui .link,
      .swagger-ui .info .base-url {
        color: #7dd3fc;
      }

      .swagger-ui .scheme-container {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 14px;
        box-shadow: none;
        margin: 0 0 24px;
      }

      .swagger-ui .opblock {
        border-radius: 12px;
        border-width: 1px;
      }

      .swagger-ui .opblock .opblock-summary {
        border-radius: 12px;
      }

      .swagger-ui .opblock .opblock-summary-path,
      .swagger-ui .opblock .opblock-summary-path__deprecated,
      .swagger-ui .opblock .opblock-summary-description {
        color: #e2e8f0 !important;
      }

      .swagger-ui .opblock.opblock-get .opblock-summary-path,
      .swagger-ui .opblock.opblock-get .opblock-summary-description {
        color: #bfdbfe !important;
      }

      .swagger-ui .opblock.opblock-post .opblock-summary-path,
      .swagger-ui .opblock.opblock-post .opblock-summary-description {
        color: #bbf7d0 !important;
      }

      .swagger-ui .opblock.opblock-put .opblock-summary-path,
      .swagger-ui .opblock.opblock-put .opblock-summary-description {
        color: #fde68a !important;
      }

      .swagger-ui .opblock.opblock-delete .opblock-summary-path,
      .swagger-ui .opblock.opblock-delete .opblock-summary-description {
        color: #fecaca !important;
      }

      .swagger-ui .opblock .opblock-section-header,
      .swagger-ui .opblock .opblock-section-request-body,
      .swagger-ui .opblock .responses-inner,
      .swagger-ui .opblock .responses-wrapper,
      .swagger-ui .opblock .response-col_links,
      .swagger-ui .opblock .response-col_status,
      .swagger-ui .opblock .response-col_description,
      .swagger-ui .opblock .parameters-container,
      .swagger-ui .opblock .parameter__in,
      .swagger-ui .opblock .parameter__name,
      .swagger-ui .opblock .parameter__type,
      .swagger-ui .opblock .parameter__deprecated,
      .swagger-ui .opblock .renderedMarkdown,
      .swagger-ui .opblock .renderedMarkdown p,
      .swagger-ui .opblock .tab li,
      .swagger-ui .opblock table thead tr th,
      .swagger-ui .opblock table tbody tr td,
      .swagger-ui .opblock .btn,
      .swagger-ui .opblock .model-title,
      .swagger-ui .opblock .model,
      .swagger-ui .opblock .model-box,
      .swagger-ui .opblock .model-box-control,
      .swagger-ui .opblock .prop-type,
      .swagger-ui .opblock .prop-format {
        color: #f8fafc !important;
      }

      .swagger-ui .opblock .opblock-section-header,
      .swagger-ui .opblock .responses-inner h4,
      .swagger-ui .opblock .responses-inner h5,
      .swagger-ui .opblock .tab-header,
      .swagger-ui .opblock table thead tr th {
        background: #0f172a !important;
      }

      .swagger-ui .opblock .responses-table,
      .swagger-ui .opblock table tbody tr td,
      .swagger-ui .opblock .response,
      .swagger-ui .opblock .highlight-code,
      .swagger-ui .opblock .model-box,
      .swagger-ui .opblock .model-example,
      .swagger-ui .opblock .parameter__extension,
      .swagger-ui .opblock .parameter__deprecated,
      .swagger-ui .opblock .parameter__name.required span,
      .swagger-ui .opblock .parameter__name.required:after {
        background: #111827 !important;
      }

      .swagger-ui .opblock .responses-wrapper,
      .swagger-ui .opblock .opblock-section-header,
      .swagger-ui .opblock table thead tr th,
      .swagger-ui .opblock table tbody tr td,
      .swagger-ui .opblock .response,
      .swagger-ui .opblock .tab li {
        border-color: #334155 !important;
      }

      .swagger-ui select,
      .swagger-ui input,
      .swagger-ui textarea {
        background: #0f172a;
        border: 1px solid #334155;
        color: #e2e8f0;
      }

      .swagger-ui .btn {
        border-radius: 10px;
      }

      .swagger-ui .topbar {
        display: none;
      }
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
