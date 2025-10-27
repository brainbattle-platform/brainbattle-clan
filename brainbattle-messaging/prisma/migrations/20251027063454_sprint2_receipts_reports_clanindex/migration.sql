-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DMReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DMReceipt_pkey" PRIMARY KEY ("messageId","userId")
);

-- CreateTable
CREATE TABLE "DMReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DMReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DMReceipt_userId_idx" ON "DMReceipt"("userId");

-- CreateIndex
CREATE INDEX "DMReceipt_messageId_idx" ON "DMReceipt"("messageId");

-- CreateIndex
CREATE INDEX "DMReport_messageId_idx" ON "DMReport"("messageId");

-- CreateIndex
CREATE INDEX "DMReport_reporterId_idx" ON "DMReport"("reporterId");

-- CreateIndex
CREATE INDEX "DMThread_clanId_idx" ON "DMThread"("clanId");
