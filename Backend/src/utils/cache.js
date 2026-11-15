import redis from "../config/redis.js";

export async function getCache(key) {
  try {
    const cachedData = await redis.get(key);

    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error("Redis cache read error:", error);
    return null;
  }
}

export async function setCache(key, data, expiry = 60) {
  try {
    await redis.set(key, JSON.stringify(data), {
      EX: expiry,
    });
  } catch (error) {
    console.error("Redis cache write error:", error);
  }
}

export async function deleteCache(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis cache delete error:", error);
  }
}

export async function invalidateUserAnalytics(userId) {
  try {
    if (!redis.isReady) {
      return;
    }

    const keys = [
      `analytics:overview:${userId}`,
    ];

    await redis.del(keys);
  } catch (error) {
    console.error("Analytics cache invalidation error:", error);
  }
}