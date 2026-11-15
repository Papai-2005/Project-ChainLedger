
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

const baseURL = "/api/v1/wallets";

const email1 = `wallet-test-${Date.now()}@example.com`;
const email2 = `wallet-other-${Date.now()}@example.com`;
const password = "ChainLedgerTest123!";

let token1;
let token2;
let userId1;
let userId2;
let walletId;

const walletAddress =
  "0x8ba1f109551bD432803012645Ac136ddd64DBA72";

const secondWalletAddress =
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

// Setup test users
before(async () => {
  const user1 = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Wallet Test User",
      email: email1,
      password,
    });

  assert.equal(user1.status, 201);

  token1 = user1.body.token;
  userId1 = user1.body.user.id;

  const user2 = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Other Test User",
      email: email2,
      password,
    });

  assert.equal(user2.status, 201);

  token2 = user2.body.token;
  userId2 = user2.body.user.id;
});

// 1. Create wallet
test("1. Create a new wallet", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      label: "Automated Test Wallet",
      address: walletAddress,
      network: "Ethereum",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  assert.equal(
    response.body.wallet.label,
    "Automated Test Wallet"
  );

  walletId = response.body.wallet.id;
});

// 2. Reject invalid Ethereum address
test("2. Reject invalid Ethereum address", async () => {
  const response = await request(app)
    .post(baseURL)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      label: "Invalid Wallet",
      address: "not-a-valid-ethereum-address",
      network: "Ethereum",
    });

  assert.equal(response.status, 400);
});

// 3. Retrieve all wallets
test("3. Retrieve all user wallets", async () => {
  const response = await request(app)
    .get(baseURL)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  assert.ok(
    response.body.wallets.some(
      (wallet) => wallet.id === walletId
    )
  );
});

// 4. Retrieve wallet by ID
test("4. Retrieve a single wallet", async () => {
  const response = await request(app)
    .get(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.wallet.id, walletId);
});

// 5. Update wallet
test("5. Update wallet details", async () => {
  const response = await request(app)
    .patch(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token1}`)
    .send({
      label: "Updated Automated Wallet",
    });

  assert.equal(response.status, 200);
  assert.equal(
    response.body.wallet.label,
    "Updated Automated Wallet"
  );
});

// 6. Prevent another user from accessing the wallet
test("6. Prevent cross-user wallet access", async () => {
  const getResponse = await request(app)
    .get(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token2}`);

  assert.equal(getResponse.status, 404);

  const updateResponse = await request(app)
    .patch(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token2}`)
    .send({
      label: "Unauthorized Update",
    });

  assert.equal(updateResponse.status, 404);

  const deleteResponse = await request(app)
    .delete(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token2}`);

  assert.equal(deleteResponse.status, 404);
});

// 7. Delete empty wallet
test("7. Delete an empty wallet", async () => {
  const response = await request(app)
    .delete(`${baseURL}/${walletId}`)
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

// 8. Verify wallet audit records
test("8. Verify wallet audit history", async () => {
  const response = await request(app)
    .get("/api/v1/audit-logs?entityType=WALLET")
    .set("Authorization", `Bearer ${token1}`);

  assert.equal(response.status, 200);

  const actions = response.body.auditLogs
    .filter((log) => log.entityId === walletId)
    .map((log) => log.action);

  assert.ok(actions.includes("WALLET_CREATED"));
  assert.ok(actions.includes("WALLET_UPDATED"));
  assert.ok(actions.includes("WALLET_DELETED"));
});

// Cleanup test data
after(async () => {
  const userIds = [userId1, userId2].filter(Boolean);

  try {
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      await prisma.wallet.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
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
