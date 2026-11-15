/*
  Warnings:

  - The values [CONFIRMED] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `blockHash` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `blockNumber` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `blockTimestamp` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `chainId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `effectiveGasPriceWei` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `fromAddress` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `gasUsed` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `logIndex` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `toAddress` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `txHash` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `valueWei` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `chainId` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the `BlockCheckpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Nonce` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WalletTransaction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,address,network]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `displayName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `label` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "public"."TransactionStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_transactionChainId_transactionHash_trans_fkey";

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_walletId_fkey";

-- DropIndex
DROP INDEX "Transaction_chainId_blockNumber_idx";

-- DropIndex
DROP INDEX "Transaction_chainId_txHash_logIndex_key";

-- DropIndex
DROP INDEX "Transaction_fromAddress_idx";

-- DropIndex
DROP INDEX "Transaction_toAddress_idx";

-- DropIndex
DROP INDEX "Wallet_address_chainId_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "blockHash",
DROP COLUMN "blockNumber",
DROP COLUMN "blockTimestamp",
DROP COLUMN "chainId",
DROP COLUMN "effectiveGasPriceWei",
DROP COLUMN "fromAddress",
DROP COLUMN "gasUsed",
DROP COLUMN "logIndex",
DROP COLUMN "toAddress",
DROP COLUMN "txHash",
DROP COLUMN "valueWei",
ADD COLUMN     "amount" DECIMAL(36,18) NOT NULL,
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reference" VARCHAR(100),
ADD COLUMN     "type" "TransactionType" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "walletId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "chainId",
ADD COLUMN     "label" VARCHAR(100) NOT NULL,
ADD COLUMN     "network" VARCHAR(40) NOT NULL DEFAULT 'Ethereum';

-- DropTable
DROP TABLE "BlockCheckpoint";

-- DropTable
DROP TABLE "Nonce";

-- DropTable
DROP TABLE "WalletTransaction";

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_address_network_key" ON "Wallet"("userId", "address", "network");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
