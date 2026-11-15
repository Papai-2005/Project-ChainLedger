import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../../config/env.js";

export const jobRedis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const transactionQueue = new Queue("transaction-jobs", {
  connection: jobRedis,
});