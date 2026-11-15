
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function generateToken(userId) {
  return jwt.sign(
    {},
    env.JWT_SECRET,
    {
      subject: userId,
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// REGISTER
router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { displayName, password } = result.data;
  const email = result.data.email.toLowerCase();

  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      success: false,
      message: "Password must not exceed 72 bytes.",
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      displayName,
      email,
      passwordHash,
    },
  });

  const token = generateToken(user.id);

  return res.status(201).json({
    success: true,
    message: "Account created successfully.",
    token,
    user: publicUser(user),
  });
});

// LOGIN
router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid login details.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const email = result.data.email.toLowerCase();
  const { password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: "This account has been disabled.",
    });
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  const token = generateToken(user.id);

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    user: publicUser(user),
  });
});

// GET CURRENT USER
router.get("/me", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: "User account not found or inactive.",
    });
  }

  return res.status(200).json({
    success: true,
    user: publicUser(user),
  });
});

// LOGOUT
router.post("/logout", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout acknowledged. Please discard your access token.",
  });
});

export default router;
