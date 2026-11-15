import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Check PostgreSQL connectivity
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      status: "healthy",
      message: "ChainLedger API is running",
      services: {
        api: "operational",
        database: "connected"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Health check failed:", error.message);

    return res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "Database connection unavailable",
      services: {
        api: "operational",
        database: "disconnected"
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

