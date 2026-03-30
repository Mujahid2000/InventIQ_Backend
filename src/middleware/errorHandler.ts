import type { ErrorRequestHandler } from "express";
import ApiError from "../utils/ApiError";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const fallbackStatusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const normalizedError =
    err instanceof ApiError ? err : new ApiError(fallbackStatusCode, err?.message || "Server Error");

  console.error(err.stack || err);

  res.status(normalizedError.statusCode).json({
    success: false,
    message: normalizedError.message,
    errors: normalizedError.errors,
    data: null,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default errorHandler;
