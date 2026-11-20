
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

transactionWorker.on("error", (error) => {
  console.error("Transaction worker error:", error);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing transaction worker...`);

  try {
    await transactionWorker.close();
    await connection.quit();
    console.log("Transaction worker shut down successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Worker shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log("Transaction worker is running...");
