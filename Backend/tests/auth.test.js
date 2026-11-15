import { test, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import redis from "../src/config/redis.js";
import {
  transactionQueue,
  jobRedis,
} from "../src/jobs/queues/transaction.queue.js";

import app from "../src/app.js";
import prisma from "../src/config/prisma.js";

const email = `test-${Date.now()}@example.com`;
const password = "ChainLedgerTest123!";
let token;

test("1. Register a new user", async () => {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Test User",
      email,
      password,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, email);

  // Password must never be returned
  assert.equal(response.body.user.passwordHash, undefined);

  token = response.body.token;
});

test("2. Reject duplicate email registration", async () => {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "Duplicate User",
      email: email.toUpperCase(),
      password,
    });

  assert.equal(response.status, 409);
});

test("3. Reject invalid registration details", async () => {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
      displayName: "A",
      email: "invalid-email",
      password: "123",
    });

  assert.equal(response.status, 400);
});

test("4. Login with correct credentials", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.token);
});

test("5. Reject incorrect password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "WrongPassword123!",
    });

  assert.equal(response.status, 401);
});

test("6. Get current user with valid JWT", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.email, email);
});

test("7. Reject invalid JWT", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", "Bearer invalid.token.value");

  assert.equal(response.status, 401);
});

test("8. Reject request without JWT", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me");

  assert.equal(response.status, 401);
});

// Clean up the test user
after(async () => {
  await prisma.user.deleteMany({
    where: { email },
  });

  await transactionQueue.close();
  await jobRedis.quit();
  if (redis.isOpen) {
  await redis.quit();
}
  await prisma.$disconnect();
});