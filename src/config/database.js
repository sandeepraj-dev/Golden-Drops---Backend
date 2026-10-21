import mongoose from "mongoose";
import { env } from "./environment.js";

export async function connectDatabase(uri = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    minPoolSize: 2
  });
  return mongoose.connection;
}

export async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary"
    });
    return result;
  } finally {
    await session.endSession();
  }
}
