import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { invalidateUserAnalytics } from "../utils/cache.js";
import { transactionQueue } from "../jobs/queues/transaction.queue.js";
import { writeAuditLog } from "../utils/auditlog.js";

const router = Router();

router.use(authenticateToken);

// Validate transaction input
const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),

    // Keep amounts as strings to avoid JavaScript floating-point errors.
    amount: z
      .string()
      .trim()
      .regex(
        /^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/,
        "Amount must be a valid decimal with up to 18 integer and 18 decimal digits."
      )
      .refine(
        (value) => !/^0+(?:\.0+)?$/.test(value),
        "Amount must be greater than zero."
      ),

    currency: z.string().trim().toUpperCase().min(3).max(10).default("INR"),
    description: z.string().trim().max(500).optional(),
    reference: z.string().trim().max(100).optional(),
    occurredAt: z.coerce.date().optional(),

    sourceWalletId: z.string().min(1).optional(),
    destinationWalletId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "INCOME" && !data.destinationWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationWalletId"],
        message: "Destination wallet is required for income.",
      });
    }

    if (data.type === "EXPENSE" && !data.sourceWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceWalletId"],
        message: "Source wallet is required for expense.",
      });
    }

    if (data.type === "TRANSFER") {
      if (!data.sourceWalletId) {
        ctx.addIssue({
          code: "custom",
          path: ["sourceWalletId"],
          message: "Source wallet is required for transfers.",
        });
      }

      if (!data.destinationWalletId) {
        ctx.addIssue({
          code: "custom",
          path: ["destinationWalletId"],
          message: "Destination wallet is required for transfers.",
        });
      }

      if (
        data.sourceWalletId &&
        data.destinationWalletId &&
        data.sourceWalletId === data.destinationWalletId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["destinationWalletId"],
          message: "Source and destination wallets must be different.",
        });
      }
    }

    if (data.type === "INCOME" && data.sourceWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceWalletId"],
        message: "Income cannot have a source wallet.",
      });
    }

    if (data.type === "EXPENSE" && data.destinationWalletId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationWalletId"],
        message: "Expense cannot have a destination wallet.",
      });
    }
  });


router.post("/", async (req, res, next) => {
  try {
    const validation = transactionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction details.",
        errors: validation.error.issues,
      });
    }

    const data = validation.data;

    // Collect wallet IDs
    const walletIds = [
      data.sourceWalletId,
      data.destinationWalletId,
    ].filter(Boolean);

    // Verify wallet ownership
    const wallets = await prisma.wallet.findMany({
      where: {
        id: { in: walletIds },
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (wallets.length !== new Set(walletIds).size) {
      return res.status(404).json({
        success: false,
        message: "One or more wallets were not found.",
      });
    }

    // Create transaction and audit log atomically
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          reference: data.reference,
          occurredAt: data.occurredAt,
          userId: req.user.id,
          sourceWalletId: data.sourceWalletId ?? null,
          destinationWalletId: data.destinationWalletId ?? null,
        },
        include: {
          sourceWallet: {
            select: {
              id: true,
              label: true,
              address: true,
            },
          },
          destinationWallet: {
            select: {
              id: true,
              label: true,
              address: true,
            },
          },
        },
      });

      await writeAuditLog(tx, {
        action: "TRANSACTION_CREATED",
        entityType: "TRANSACTION",
        entityId: newTransaction.id,
        userId: req.user.id,
        metadata: {
          type: newTransaction.type,
          amount: newTransaction.amount.toString(),
          currency: newTransaction.currency,
          description: newTransaction.description,
          reference: newTransaction.reference,
          sourceWalletId: newTransaction.sourceWalletId,
          destinationWalletId: newTransaction.destinationWalletId,
        },
      });

      return newTransaction;
    });

    // Dispatch background job after database commit
    await transactionQueue.add(
      "transaction-created",
      {
        transactionId: transaction.id,
        userId: req.user.id,
        type: transaction.type,
      },
      {
        jobId: `transaction-${transaction.id}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    // Invalidate analytics cache
    await invalidateUserAnalytics(req.user.id);

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction,
    });

  } catch (error) {
    next(error);
  }
});


router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const { type, status, walletId } = req.query;

    const filters = {
      userId: req.user.id,
      ...(type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type)
        ? { type }
        : {}),
      ...(status && ["PENDING", "COMPLETED", "FAILED"].includes(status)
        ? { status }
        : {}),
      ...(walletId
        ? {
            OR: [
              { sourceWalletId: walletId },
              { destinationWalletId: walletId },
            ],
          }
        : {}),
    };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: filters,
        include: {
          sourceWallet: {
            select: { id: true, label: true },
          },
          destinationWallet: {
            select: { id: true, label: true },
          },
        },
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: filters }),
    ]);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      transactions,
    });
  } catch (error) {
    next(error);
  }
});



router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
      include: {
        sourceWallet: {
          select: {
            id: true,
            label: true,
            address: true,
          },
        },
        destinationWallet: {
          select: {
            id: true,
            label: true,
            address: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
});



const updateTransactionSchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
  reference: z.string().trim().max(100).nullable().optional(),
}).refine(
  (data) => data.description !== undefined || data.reference !== undefined,
  { message: "At least one field must be provided." }
);


router.patch("/:id", async (req, res, next) => {
  try {
    const validation = updateTransactionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction update.",
        errors: validation.error.issues,
      });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    // Update transaction and create audit log atomically
    const transaction = await prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transaction.update({
        where: {
          id: existing.id,
        },
        data: validation.data,
      });

      await writeAuditLog(tx, {
        action: "TRANSACTION_UPDATED",
        entityType: "TRANSACTION",
        entityId: updatedTransaction.id,
        userId: req.user.id,
        metadata: {
          previous: {
            description: existing.description,
            reference: existing.reference,
          },
          updated: {
            description: updatedTransaction.description,
            reference: updatedTransaction.reference,
          },
        },
      });

      return updatedTransaction;
    });

    // Invalidate cached analytics
    await invalidateUserAnalytics(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully.",
      transaction,
    });

  } catch (error) {
    next(error);
  }
});



export default router;
