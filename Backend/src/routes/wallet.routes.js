import { Router } from "express";
import { z } from "zod";
import { isAddress, getAddress } from "ethers";
import { writeAuditLog } from "../utils/auditlog.js";
import prisma from "../config/prisma.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

const createWalletSchema = z.object({
  label: z.string().trim().min(2).max(100),
  address: z.string().trim(),
  network: z.string().trim().min(2).max(40).default("Ethereum"),
});

const updateWalletSchema = z.object({
  label: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().optional(),
  network: z.string().trim().min(2).max(40).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided.",
});

function validateAddress(address) {
  if (!isAddress(address)) {
    return null;
  }

  return getAddress(address);
}

// CREATE WALLET
router.post("/", async (req, res) => {
  const result = createWalletSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid wallet details.",
      errors: result.error.issues,
    });
  }

  const normalizedAddress = validateAddress(result.data.address);

  if (!normalizedAddress) {
    return res.status(400).json({
      success: false,
      message: "Invalid Ethereum wallet address.",
    });
  }

  const wallet = await prisma.$transaction(async (tx) => {
  const newWallet = await tx.wallet.create({
    data: {
      label: result.data.label,
      address: normalizedAddress,
      network: result.data.network,
      userId: req.user.id,
    },
  });

  await writeAuditLog(tx, {
    action: "WALLET_CREATED",
    entityType: "WALLET",
    entityId: newWallet.id,
    userId: req.user.id,
    metadata: {
      label: newWallet.label,
      network: newWallet.network,
      address: newWallet.address,
    },
  });

  return newWallet;
});

return res.status(201).json({
  success: true,
  message: "Wallet created successfully.",
  wallet,
});

});

// GET ALL USER WALLETS
router.get("/", async (req, res) => {
  const wallets = await prisma.wallet.findMany({
    where: {
      userId: req.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json({
    success: true,
    count: wallets.length,
    wallets,
  });
});

// GET SINGLE WALLET
router.get("/:id", async (req, res) => {
  const wallet = await prisma.wallet.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!wallet) {
    return res.status(404).json({
      success: false,
      message: "Wallet not found.",
    });
  }

  return res.status(200).json({
    success: true,
    wallet,
  });
});

// UPDATE WALLET
router.patch("/:id", async (req, res) => {
  const result = updateWalletSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid wallet update details.",
      errors: result.error.issues,
    });
  }

  const existingWallet = await prisma.wallet.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!existingWallet) {
    return res.status(404).json({
      success: false,
      message: "Wallet not found.",
    });
  }

  const updateData = { ...result.data };

  if (updateData.address) {
    const normalizedAddress = validateAddress(updateData.address);

    if (!normalizedAddress) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ethereum wallet address.",
      });
    }

    updateData.address = normalizedAddress;
  }

  const wallet = await prisma.$transaction(async (tx) => {
  const updatedWallet = await tx.wallet.update({
    where: {
      id: existingWallet.id,
    },
    data: updateData,
  });

  await writeAuditLog(tx, {
    action: "WALLET_UPDATED",
    entityType: "WALLET",
    entityId: updatedWallet.id,
    userId: req.user.id,
    metadata: {
      previous: {
        label: existingWallet.label,
        address: existingWallet.address,
        network: existingWallet.network,
      },
      updated: {
        label: updatedWallet.label,
        address: updatedWallet.address,
        network: updatedWallet.network,
      },
    },
  });

  return updatedWallet;
});

  return res.status(200).json({
    success: true,
    message: "Wallet updated successfully.",
    wallet,
  });
});

// DELETE WALLET
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify wallet ownership
      const wallet = await tx.wallet.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!wallet) {
        return { notFound: true };
      }

      // 2. Check transaction history
      const transactionCount = await tx.transaction.count({
        where: {
          userId: req.user.id,
          OR: [
            { sourceWalletId: id },
            { destinationWalletId: id },
          ],
        },
      });

      if (transactionCount > 0) {
        return { hasTransactions: true };
      }

      // 3. Create audit record
      await writeAuditLog(tx, {
        action: "WALLET_DELETED",
        entityType: "WALLET",
        entityId: wallet.id,
        userId: req.user.id,
        metadata: {
          label: wallet.label,
          address: wallet.address,
          network: wallet.network,
        },
      });

      // 4. Delete wallet
      await tx.wallet.delete({
        where: { id: wallet.id },
      });

      return { deleted: true };
    });

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    if (result.hasTransactions) {
      return res.status(409).json({
        success: false,
        message:
          "This wallet cannot be deleted because it has transaction history.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
