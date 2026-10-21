import mongoose from "mongoose";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
      requestId: req.id ?? null,
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
    details = err.issues.map(({ path, message }) => ({
      path: path.join("."),
      message,
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
  } else if (
    err instanceof mongoose.Error ||
    /buffering timed out/i.test(err.message || "")
  ) {
    status = 503;
    code = "DATABASE_UNAVAILABLE";
    message = "Database operation could not be completed";
  }

  const isServerError = status >= 500;

  if (isServerError) {
    console.error(
      JSON.stringify({
        event: "API_ERROR",
        requestId: req.id ?? null,
        method: req.method,
        path: req.originalUrl,
        status,
        code,
        errorName: err.name,
        errorMessage: err.message,
        errorCode: err.code ?? null,
        mongooseReadyState: mongoose.connection.readyState,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      }),
    );

    // Do not return database details or stack traces to clients.
    message =
      status === 503
        ? "Database temporarily unavailable"
        : "An internal error occurred";

    details = undefined;
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      requestId: req.id ?? null,
      ...(details ? { details } : {}),
    },
  });
}
