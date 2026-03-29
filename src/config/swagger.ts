import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "InventIQ Backend API",
    version: "1.0.0",
    description: "Inventory and order management backend APIs",
  },
  servers: [
    {
      url: process.env.API_BASE_URL || "http://localhost:5000",
      description: "Current API server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "API is running",
          },
        },
      },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "400": { description: "Bad request" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "Get all categories",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Categories list" },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Category created" },
        },
      },
    },
    "/api/categories/{id}": {
      put: {
        tags: ["Categories"],
        summary: "Update category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category updated" },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Delete category (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category deleted" },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "Get all products",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Products list" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create product",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Product created" },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product details" },
        },
      },
      put: {
        tags: ["Products"],
        summary: "Update product",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product updated" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete product (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product deleted" },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "Get all orders",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Orders list" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create order",
        security: [{ bearerAuth: [] }],
        responses: {
          "201": { description: "Order created" },
        },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Order details" },
        },
      },
      delete: {
        tags: ["Orders"],
        summary: "Delete order (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Order deleted" },
        },
      },
    },
    "/api/orders/{id}/status": {
      put: {
        tags: ["Orders"],
        summary: "Update order status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Status updated" },
        },
      },
    },
    "/api/orders/{id}/cancel": {
      put: {
        tags: ["Orders"],
        summary: "Cancel order",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Order cancelled" },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard stats",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Dashboard stats" },
        },
      },
    },
    "/api/restock": {
      get: {
        tags: ["Restock"],
        summary: "Get restock queue",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Restock queue" },
        },
      },
    },
    "/api/restock/{id}": {
      put: {
        tags: ["Restock"],
        summary: "Update restock item",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Restock updated" },
        },
      },
      delete: {
        tags: ["Restock"],
        summary: "Delete restock item",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Restock removed" },
        },
      },
    },
    "/api/logs": {
      get: {
        tags: ["Logs"],
        summary: "Get activity logs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Activity logs" },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [],
});

export default swaggerSpec;
