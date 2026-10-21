import mongoose from "mongoose";
import { ZodError } from "zod";

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;
  let status = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "Unexpected server error";
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = err.issues.map(({ path, message: issueMessage }) => ({
      path: path.join("."),
      message: issueMessage,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = "MODEL_VALIDATION_ERROR";
    message = "Database validation failed";
    details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  } else if (err?.code === 11000) {
    status = 409;
    code = "DUPLICATE_KEY";
    message = "A record with this unique value already exists";
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = "INVALID_ID";
    message = "Invalid identifier or value";
  }
  if (status >= 500) {
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.path,
      error: err.message,
    });
    message =
      process.env.NODE_ENV === "production"
        ? "An internal error occurred"
        : message;
  }
  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}
