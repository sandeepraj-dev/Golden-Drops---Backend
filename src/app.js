import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import routes from "./routes/index.js";
import { env } from "./config/environment.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import requestIdMiddleware from "./middleware/requestId.js";

const app = express();

// Generate a request ID before logging, rate limiting, or routing.
app.use(requestIdMiddleware);

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = env.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Request compression
app.use(compression());

// Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Oil Mill Management API",
    docs: "/api-docs",
    health: "/api/v1/health",
  });
});
app.get("/api/v1/debug/proxy", (req, res) => {
  res.json({
    trustProxy: app.get("trust proxy"),
    ip: req.ip,
    ips: req.ips,
    remoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.get("x-forwarded-for"),
    xRealIp: req.get("x-real-ip"),
  });
});
// Swagger / OpenAPI configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.resolve(__dirname, "../docs/openapi.yaml");

if (fs.existsSync(openapiPath)) {
  app.get("/openapi.yaml", (_req, res) => {
    res.type("text/yaml").send(fs.readFileSync(openapiPath, "utf8"));
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerUrl: "/openapi.yaml",
    }),
  );
}

// API routes
app.use("/api/v1", routes);

// 404 handler
app.use(notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

export default app;
