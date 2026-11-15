
import { createClient } from "redis";
import { env } from "./env.js";

const redis = createClient({
  url: env.REDIS_URL,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }

  console.log("Redis connected successfully.");
}

export default redis;
