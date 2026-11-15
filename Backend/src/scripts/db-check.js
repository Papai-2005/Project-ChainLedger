
import prisma from "../config/prisma.js";

async function testDatabase() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS connected`;

    console.log("Database query successful!");
    console.log("Query result:", result);
  } catch (error) {
    console.error("Database query failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
