import mongoose from "mongoose";
import { env } from "./environment.js";

let connectionPromise;

export async function connectDatabase(uri = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    console.log("[DB] Connecting to MongoDB Atlas");

    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 30000,
        bufferTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 0,
      })
      .then(() => {
        console.log("[DB] Connected successfully");
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;

        console.error("[DB] Connection failed:", {
          name: error.name,
          message: error.message,
          code: error.code,
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
