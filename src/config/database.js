import mongoose from "mongoose";
import { env } from "./environment.js";

let connectionPromise;

export async function connectDatabase(
  uri = process.env.MONGODB_URI || env.MONGODB_URI,
) {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
        minPoolSize: 0,
      })
      .then(() => {
        console.log("MongoDB connected successfully");
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;

        console.error("MongoDB connection failed:", error.message);

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
