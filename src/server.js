import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/environment.js";

let server;
try {
  await connectDatabase();
  server = app.listen(env.PORT, () => console.log(`Oil Mill API listening on port ${env.PORT} (${env.NODE_ENV})`));
} catch (err) {
  console.error("Startup failed:", err.message);
  process.exit(1);
}
async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
