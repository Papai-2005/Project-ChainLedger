import app from "./app.js";
import { env } from "./config/env.js";
import prisma from "./config/prisma.js";
import { connectDatabase } from "./config/database.js";
import redis, { connectRedis } from "./config/redis.js";

let server;

async function startServer() {
  await connectDatabase();
  await connectRedis();

  server = app.listen(env.PORT, () => {
    console.log(
      `ChainLedger API running on http://localhost:${env.PORT}`
    );
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    console.log("HTTP server closed.");

    if (redis.isOpen) {
      await redis.quit();
      console.log("Redis connection closed.");
    }

    await prisma.$disconnect();
    console.log("Database connection closed.");
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch(async (error) => {
  console.error("Server startup failed:", error);

  if (redis.isOpen) {
    await redis.quit().catch(() => {});
  }

  await prisma.$disconnect().catch(() => {});

  process.exit(1);
});

