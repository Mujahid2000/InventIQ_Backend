import type { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  console.error(err.stack || err);

  res.status(statusCode).json({
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export default errorHandler;
