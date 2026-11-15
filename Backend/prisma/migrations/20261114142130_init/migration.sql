-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nonce" (
    "id" TEXT NOT NULL,
    "walletAddress" VARCHAR(42) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "nonceHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "logIndex" INTEGER NOT NULL DEFAULT -1,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" VARCHAR(66),
    "fromAddress" VARCHAR(42) NOT NULL,
    "toAddress" VARCHAR(42),
    "valueWei" VARCHAR(78) NOT NULL,
    "gasUsed" VARCHAR(78),
    "effectiveGasPriceWei" VARCHAR(78),
    "status" "TransactionStatus" NOT NULL,
    "blockTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "walletId" TEXT NOT NULL,
    "transactionChainId" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionLogIndex" INTEGER NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("walletId","transactionChainId","transactionHash","transactionLogIndex")
);

-- CreateTable
CREATE TABLE "BlockCheckpoint" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "lastProcessedBlock" BIGINT NOT NULL DEFAULT 0,
    "lastProcessedBlockHash" VARCHAR(66),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_chainId_key" ON "Wallet"("address", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "Nonce_nonceHash_key" ON "Nonce"("nonceHash");

-- CreateIndex
CREATE INDEX "Nonce_walletAddress_chainId_idx" ON "Nonce"("walletAddress", "chainId");

-- CreateIndex
CREATE INDEX "Nonce_expiresAt_idx" ON "Nonce"("expiresAt");

-- CreateIndex
CREATE INDEX "Transaction_chainId_blockNumber_idx" ON "Transaction"("chainId", "blockNumber");

-- CreateIndex
CREATE INDEX "Transaction_fromAddress_idx" ON "Transaction"("fromAddress");

-- CreateIndex
CREATE INDEX "Transaction_toAddress_idx" ON "Transaction"("toAddress");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_chainId_txHash_logIndex_key" ON "Transaction"("chainId", "txHash", "logIndex");

-- CreateIndex
CREATE UNIQUE INDEX "BlockCheckpoint_chainId_key" ON "BlockCheckpoint"("chainId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_transactionChainId_transactionHash_trans_fkey" FOREIGN KEY ("transactionChainId", "transactionHash", "transactionLogIndex") REFERENCES "Transaction"("chainId", "txHash", "logIndex") ON DELETE CASCADE ON UPDATE CASCADE;
