import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

// GET USER AUDIT LOGS
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const { entityType, action } = req.query;

    const where = {
      userId: req.user.id,
      ...(entityType && { entityType }),
      ...(action && { action }),
    };

    const [auditLogs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      auditLogs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;