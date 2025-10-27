-- AlterTable
ALTER TABLE "DMMessage" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DMUserThreadSetting" (
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedUntil" TIMESTAMP(3),
    "pinnedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DMUserThreadSetting_pkey" PRIMARY KEY ("threadId","userId")
);

-- CreateIndex
CREATE INDEX "DMUserThreadSetting_userId_idx" ON "DMUserThreadSetting"("userId");

-- CreateIndex
CREATE INDEX "DMUserThreadSetting_threadId_idx" ON "DMUserThreadSetting"("threadId");
