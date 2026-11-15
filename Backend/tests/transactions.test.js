
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import redis from "../src/config/redis.js";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";

import {
  transactionQueue,
  jobRedis,
} from "../src/jobs/queues/transaction.queue.js";

const baseURL = "/api/v1/transactions";
const password = "ChainLedgerTest123!";

const email1 = `transaction-test-${Date.now()}@example.com`;
const email2 = `transaction-other-${Date.now()}@example.com`;

let token1;
let token2;
let userId1;
let userId2;
let walletId1;
let walletId2;

let incomeTransactionId;
let expenseTransactionId;

const walletAddress1 =
  "0x8ba1f109551bD432803012645Ac136ddd64DBA72";

const walletAddress2 =
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

// Setup test users and wallets
before(async () => {
  const user1 = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Transaction Test User",
      email: email1,
      password,
    });

  assert.equal(user1.status, 201);

  token1 = user1.body.token;
  userId1 = user1.body.user.id;

  const user2 = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Other Transaction User",
      email: email2,
      password,
    });

  assert.equal(user2.status, 201);

  token2 = user2.body.token;
  userId2 = user2.body.user.id;

  const wallet1 = await request(app)
    .post("/api/v1/wallets")
    .set("Authorization", `Bearer ${token1}`)
    .send({
      label: "Transaction Test Wallet",
      address: walletAddress1,
      network: "Ethereum",
    });

  assert.equal(wallet1.status, 201);
  walletId1 = wallet1.body.wallet.id;

  const wallet2 = await request(app)
    .post("/api/v1/wallets")
    .set("Authorization", `Bearer ${token2}`)
    .send({
      label: "Other User Wallet",
      address: walletAddress2,
      network: "Ethereum",
    });

  assert.equal(wallet2.status, 201);
  walletId2 = wallet2.body.wallet.id;
});

// 1. Create income transaction
test("1. Create income transaction", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      type: "INCOME",
      amount: "1500.50",
      currency: "INR",
      description: "Automated income test",
      reference: "TEST-INCOME-001",
      destinationWalletId: walletId1,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.transaction.type, "INCOME");
  assert.equal(response.body.transaction.currency, "INR");

  incomeTransactionId = response.body.transaction.id;
});

// 2. Reject zero amount
test("2. Reject zero transaction amount", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      type: "INCOME",
      amount: "0",
      currency: "INR",
      destinationWalletId: walletId1,
    });

  assert.equal(response.status, 400);
});

// 3. Reject invalid transaction type
test("3. Reject invalid transaction type", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      type: "PAYMENT",
      amount: "500",
      destinationWalletId: walletId1,
    });

  assert.equal(response.status, 400);
});

// 4. Reject another user's wallet
test("4. Reject transaction using another user's wallet", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      type: "INCOME",
      amount: "500",
      destinationWalletId: walletId2,
    });

  assert.equal(response.status, 404);
});

// 5. Create expense transaction
test("5. Create expense transaction", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      type: "EXPENSE",
      amount: "250.25",
      currency: "INR",
      description: "Automated expense test",
      reference: "TEST-EXPENSE-001",
      sourceWalletId: walletId1,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.transaction.type, "EXPENSE");

  expenseTransactionId = response.body.transaction.id;
});

// 6. Retrieve transaction history
test("6. Retrieve transaction history", async () => {
  const response = await request(app)
    .get(baseURL)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.total >= 2);
});

// 7. Test pagination
test("7. Test transaction pagination", async () => {
  const response = await request(app)
    .get(`${baseURL}?page=1&limit=1`)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 1);
  assert.equal(response.body.count, 1);
  assert.ok(response.body.totalPages >= 2);
});

// 8. Filter transactions by type
test("8. Filter transactions by type", async () => {
  const response = await request(app)
    .get(`${baseURL}?type=INCOME`)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);

  assert.ok(
    response.body.transactions.every(
      (transaction) => transaction.type === "INCOME"
    )
  );
});

// 9. Retrieve a single transaction
test("9. Retrieve transaction by ID", async () => {
  const response = await request(app)
    .get(`${baseURL}/${incomeTransactionId}`)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(
    response.body.transaction.id,
    incomeTransactionId
  );
});

// 10. Update transaction
test("10. Update transaction description and reference", async () => {
  const response = await request(app)
    .patch(`${baseURL}/${incomeTransactionId}`)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      description: "Updated automated transaction",
      reference: "TEST-INCOME-UPDATED",
    });

  assert.equal(response.status, 200);
  assert.equal(
    response.body.transaction.description,
    "Updated automated transaction"
  );
});

// 11. Reject empty transaction update
test("11. Reject empty transaction update", async () => {
  const response = await request(app)
    .patch(`${baseURL}/${incomeTransactionId}`)
    .set("Authorization", `Bearer ${token1}`)
    .send({});

  assert.equal(response.status, 400);
});

// 12. Prevent cross-user transaction access
test("12. Prevent another user from accessing transaction", async () => {
  const getResponse = await request(app)
    .get(`${baseURL}/${incomeTransactionId}`)
    .set("Authorization", `Bearer ${token2}`);

  assert.equal(getResponse.status, 404);

  const updateResponse = await request(app)
    .patch(`${baseURL}/${incomeTransactionId}`)
    .set("Authorization", `Bearer ${token2}`)
    .send({
      description: "Unauthorized update",
    });

  assert.equal(updateResponse.status, 404);
});

// 13. Verify transaction audit records
test("13. Verify transaction audit history", async () => {
  const response = await request(app)
    .get("/api/v1/audit-logs?entityType=TRANSACTION")
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);

  const actions = response.body.auditLogs
    .filter(
      (log) =>
        log.entityId === incomeTransactionId ||
        log.entityId === expenseTransactionId
    )
    .map((log) => log.action);

  assert.ok(actions.includes("TRANSACTION_CREATED"));
  assert.ok(actions.includes("TRANSACTION_UPDATED"));
});

// Cleanup test data
after(async () => {
  const userIds = [userId1, userId2].filter(Boolean);

  try {
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: userIds } },
      });

      await prisma.transaction.deleteMany({
        where: { userId: { in: userIds } },
      });

      await prisma.wallet.deleteMany({
        where: { userId: { in: userIds } },
      });

      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  } finally {
    await transactionQueue.close();
    await jobRedis.quit();
    if (redis.isOpen) {
  await redis.quit();
}
    await prisma.$disconnect();
  }
});