import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 1500,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: () => null,
});

redis.on("error", (err) => {
  // Redis is optional for local/mobile testing — avoid flooding logs when it is down.
  if (env.NODE_ENV === "development") {
    return;
  }
  console.error("Redis connection error:", err.message);
});
