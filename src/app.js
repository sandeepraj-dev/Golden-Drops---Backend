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

const app = express();

// FIX: Configure proxy trust for Vercel.
// Do this before express-rate-limit.
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
      ) {
        return callback(null, true);
      }

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
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // 100 requests per client per window
    standardHeaders: "draft-8",
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
app.get("/api/debug-ip", (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    trustProxy: app.get("trust proxy"),
  });
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.resolve(__dirname, "../docs/openapi.yaml");

if (fs.existsSync(openapiPath)) {
  app.get("/openapi.yaml", (_req, res) =>
    res.type("text/yaml").send(fs.readFileSync(openapiPath, "utf8")),
  );

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerUrl: "/openapi.yaml" }),
  );
}

app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
