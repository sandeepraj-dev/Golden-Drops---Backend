import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import routes from "./routes/index.js";
import { env } from "./config/environment.js";
import { connectDatabase } from "./config/database.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = env.CORS_ORIGINS.split(",").map((item) =>
        item.trim(),
      );

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

// Basic health check: does not require MongoDB.
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Oil Mill Management API",
    health: "/api/v1/health",
    databaseHealth: "/api/v1/health/db",
  });
});

// Database diagnostics.
app.get("/api/v1/health/db", (_req, res) => {
  const state = mongoose.connection.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];

  res.status(state === 1 ? 200 : 503).json({
    success: state === 1,
    database: {
      state: states[state] ?? "unknown",
      readyState: state,
      hostConfigured: Boolean(mongoose.connection.host),
    },
  });
});

// Ensure MongoDB is connected before API routes execute.
app.use("/api/v1", async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error("[DB] Request blocked because connection failed", {
      name: error.name,
      message: error.message,
      code: error.code,
      readyState: mongoose.connection.readyState,
    });

    next(error);
  }
});

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
