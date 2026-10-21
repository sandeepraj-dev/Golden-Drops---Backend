import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/environment.js";

let server;

try {
  await connectDatabase();

  server = app.listen(env.PORT, () => {
    console.log(`Oil Mill API running on port ${env.PORT}`);
  });
} catch (error) {
  console.error("Server startup failed:", error.message);
  process.exit(1);
}

function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
