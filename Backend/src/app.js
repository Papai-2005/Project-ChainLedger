import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import transactionRoutes from "./routes/transactions.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import auditRoutes from "./routes/audit.routes.js";

import { notFoundHandler } from "./middlewares/not-found.middlewares.js";
import { errorHandler } from "./middlewares/error.middlewares.js";

const app = express();

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. JSON parsing
app.use(express.json({ limit: "10kb" }));

// 4. API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// 5. API routes
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wallets", walletRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/audit-logs", auditRoutes);

// 6. Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
