import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { env } from "./config/environment.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// Vercel proxy configuration
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = env.CORS_ORIGINS.split(",").map((origin) =>
        origin.trim(),
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

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Oil Mill Management API",
    health: "/api/v1/health",
  });
});

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
