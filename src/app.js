import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";
import { env } from "./config/environment.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import requestIdMiddleware from "./middleware/requestId.js";

const app = express();
// Trust the single reverse proxy in front of the app (for example, Vercel).
// This lets express-rate-limit derive the client IP from X-Forwarded-For safely.
// Avoid `true` here: trusting every proxy hop can allow IP spoofing.
// Vercel terminates the public request at its proxy before forwarding it here.
// Trust one proxy hop; do not use `true`, which can allow spoofed forwarded IPs.
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.CORS_ORIGINS.split(",")
          .map((s) => s.trim())
          .includes(origin)
      )
        return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.get("/", (_req, res) =>
  res.json({
    success: true,
    message: "Oil Mill Management API",
    docs: "/api-docs",
    health: "/api/v1/health",
  }),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.resolve(__dirname, "../docs/openapi.yaml");
if (fs.existsSync(openapiPath)) {
  // Swagger UI accepts a URL; serving YAML directly keeps this simple and deployment-safe.
  app.get("/openapi.yaml", (_req, res) =>
    res.type("text/yaml").send(fs.readFileSync(openapiPath, "utf8")),
  );
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerUrl: "/openapi.yaml" }),
  );
}

// Generate request ID for every request
app.use(requestIdMiddleware);

app.use("/api/v1", routes);
app.use(notFoundHandler);
export default app;
