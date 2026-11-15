import { Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../../config/env.js";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const transactionWorker = new Worker(
  "transaction-jobs",
  async (job) => {
    console.log("Processing transaction job:", job.id);

    const { transactionId, userId, type } = job.data;

    // Placeholder for notification processing.
    console.log("Transaction notification:", {
      transactionId,
      userId,
      type,
    });

    return {
      success: true,
      transactionId,
    };
  },
  { connection }
);

transactionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully.`);
});

transactionWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Transaction worker is running...");