import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
const app = express();

app.use(cors());
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Golden Drops Backend is running!",
  });
});

// API routes
app.use("/api/v1", routes);

// 404 handler
app.use(notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

export default app;
