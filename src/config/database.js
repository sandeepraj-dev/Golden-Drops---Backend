import mongoose from "mongoose";
import { env } from "./environment.js";

let connectionPromise;

// Log database connection events for debugging.
mongoose.connection.on("connected", () => {
  console.log("[DB] MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
  console.warn("[DB] MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("[DB] MongoDB connection error:", {
    name: error.name,
    message: error.message,
    code: error.code,
  });
});

export async function connectDatabase(uri = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  // Reuse an existing active connection.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse an in-progress connection attempt.
  if (!connectionPromise) {
    console.log("[DB] Connecting to MongoDB Atlas");

    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 0,
        bufferTimeoutMS: 30000,
      })
      .then(() => {
        console.log("[DB] Connected successfully");
        return mongoose.connection;
      })
      .catch((error) => {
        // Allow a later request to retry the connection.
        connectionPromise = undefined;

        console.error("[DB] Connection failed:", {
          name: error.name,
          message: error.message,
          code: error.code,
          readyState: mongoose.connection.readyState,
        });

        throw error;
      });
  }

  return connectionPromise;
}

export async function withTransaction(work) {
  await connectDatabase();

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );

    return result;
  } finally {
    await session.endSession();
  }
}
