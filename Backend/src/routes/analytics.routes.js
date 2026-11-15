import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCache, setCache } from "../utils/cache.js";
const router = Router();

router.use(authenticateToken);



router.get("/overview", async (req, res, next) => {
  const userId = req.user.id;

  try {
    const cacheKey = `analytics:overview:${userId}`;

    // Check Redis cache first
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        cached: true,
      });
    }

    const [
      income,
      expenses,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),

      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),

      prisma.transaction.count({
        where: { userId },
      }),

      prisma.transaction.findMany({
        where: { userId },
        orderBy: { occurredAt: "desc" },
        take: 5,
        include: {
          sourceWallet: {
            select: { id: true, label: true },
          },
          destinationWallet: {
            select: { id: true, label: true },
          },
        },
      }),
    ]);

    const totalIncome = income._sum.amount ?? new Prisma.Decimal(0);
    const totalExpenses = expenses._sum.amount ?? new Prisma.Decimal(0);
    const netBalance = totalIncome.minus(totalExpenses);

    const responseData = {
      success: true,
      overview: {
        currency: "INR",
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        netBalance: netBalance.toString(),
        totalTransactions,
      },
      recentTransactions,
    };

    await setCache(cacheKey, responseData, 60);

    return res.status(200).json({
      ...responseData,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
});




router.get("/monthly", async (req, res, next) => {
  try {
    const querySchema = z.object({
      year: z.coerce.number().int().min(2000).max(2100).optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
    });

    const validation = querySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year.",
        errors: validation.error.issues,
      });
    }

    // Get current year and month in India.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
    }).formatToParts(new Date());

    const currentYear = Number(
      parts.find((part) => part.type === "year").value
    );

    const currentMonth = Number(
      parts.find((part) => part.type === "month").value
    );

    const year = validation.data.year ?? currentYear;
    const month = validation.data.month ?? currentMonth;

    // India timezone is UTC+05:30.
    const indiaOffset = 330 * 60 * 1000;

    const startDate = new Date(
      Date.UTC(year, month - 1, 1) - indiaOffset
    );

    const endDate = new Date(
      Date.UTC(year, month, 1) - indiaOffset
    );

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        currency: "INR",
        status: "COMPLETED",
        occurredAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        occurredAt: true,
      },
      orderBy: {
        occurredAt: "asc",
      },
    });

    let totalIncome = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);

    const transactionCounts = {
      INCOME: 0,
      EXPENSE: 0,
      TRANSFER: 0,
    };

    const dailyBreakdown = {};

    for (const transaction of transactions) {
      const amount = new Prisma.Decimal(transaction.amount);

      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(transaction.occurredAt);

      if (!dailyBreakdown[day]) {
        dailyBreakdown[day] = {
          date: day,
          income: "0",
          expenses: "0",
          transactions: 0,
        };
      }

      dailyBreakdown[day].transactions += 1;
      transactionCounts[transaction.type] += 1;

      if (transaction.type === "INCOME") {
        totalIncome = totalIncome.plus(amount);

        dailyBreakdown[day].income = new Prisma.Decimal(
          dailyBreakdown[day].income
        ).plus(amount).toString();
      }

      if (transaction.type === "EXPENSE") {
        totalExpenses = totalExpenses.plus(amount);

        dailyBreakdown[day].expenses = new Prisma.Decimal(
          dailyBreakdown[day].expenses
        ).plus(amount).toString();
      }
    }

    const netBalance = totalIncome.minus(totalExpenses);

    return res.status(200).json({
      success: true,
      period: {
        year,
        month,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
      summary: {
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        netBalance: netBalance.toString(),
        totalTransactions: transactions.length,
        transactionCounts,
      },
      dailyBreakdown: Object.values(dailyBreakdown),
    });
  } catch (error) {
    next(error);
  }
});



router.get("/wallets", async (req, res, next) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        label: true,
        address: true,
        network: true,

        incomingTransactions: {
          where: {
            userId: req.user.id,
            currency: "INR",
            status: "COMPLETED",
          },
          select: {
            id: true,
            type: true,
            amount: true,
          },
        },

        outgoingTransactions: {
          where: {
            userId: req.user.id,
            currency: "INR",
            status: "COMPLETED",
          },
          select: {
            id: true,
            type: true,
            amount: true,
          },
        },
      },
    });

    const walletAnalytics = wallets.map((wallet) => {
      let income = new Prisma.Decimal(0);
      let expenses = new Prisma.Decimal(0);
      let transfersIn = new Prisma.Decimal(0);
      let transfersOut = new Prisma.Decimal(0);

      for (const transaction of wallet.incomingTransactions) {
        const amount = new Prisma.Decimal(transaction.amount);

        if (transaction.type === "INCOME") {
          income = income.plus(amount);
        }

        if (transaction.type === "TRANSFER") {
          transfersIn = transfersIn.plus(amount);
        }
      }

      for (const transaction of wallet.outgoingTransactions) {
        const amount = new Prisma.Decimal(transaction.amount);

        if (transaction.type === "EXPENSE") {
          expenses = expenses.plus(amount);
        }

        if (transaction.type === "TRANSFER") {
          transfersOut = transfersOut.plus(amount);
        }
      }

      const totalInflow = income.plus(transfersIn);
      const totalOutflow = expenses.plus(transfersOut);

      const transactionIds = new Set([
        ...wallet.incomingTransactions.map((tx) => tx.id),
        ...wallet.outgoingTransactions.map((tx) => tx.id),
      ]);

      return {
        id: wallet.id,
        label: wallet.label,
        address: wallet.address,
        network: wallet.network,
        currency: "INR",
        income: income.toString(),
        expenses: expenses.toString(),
        transfersIn: transfersIn.toString(),
        transfersOut: transfersOut.toString(),
        totalInflow: totalInflow.toString(),
        totalOutflow: totalOutflow.toString(),
        netActivity: totalInflow.minus(totalOutflow).toString(),
        totalTransactions: transactionIds.size,
      };
    });

    return res.status(200).json({
      success: true,
      count: walletAnalytics.length,
      wallets: walletAnalytics,
    });
  } catch (error) {
    next(error);
  }
});



export default router;
