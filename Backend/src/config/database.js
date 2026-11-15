import prisma from "./prisma.js";

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}