import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import mongoose from "mongoose";

// Apply proxy trust on the exact Express instance exported to Vercel.
// Keep this before any request reaches express-rate-limit.
app.set("trust proxy", 1);

// Vercel runs this as a serverless function. Connect before allowing any route
// (including login) to query Mongoose. connectDatabase caches warm connections.
export default async function handler(req, res) {
  try {
    await connectDatabase();
    console.info("Vercel API bootstrap", {
      trustProxy: app.get("trust proxy"),
      mongoReadyState: mongoose.connection.readyState,
    });
    return app(req, res);
  } catch (error) {
    console.error("Vercel request could not connect to MongoDB", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      codeName: error?.codeName,
    });

    if (res.headersSent) return;
    return res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection unavailable. Check the deployment database configuration.",
      },
    });
  }
}
