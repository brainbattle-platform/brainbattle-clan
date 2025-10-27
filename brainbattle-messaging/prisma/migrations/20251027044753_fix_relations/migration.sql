/*
  Warnings:

  - You are about to drop the column `dMThreadId` on the `DMMessage` table. All the data in the column will be lost.
  - You are about to drop the column `dMThreadId` on the `DMParticipant` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DMMessage" DROP CONSTRAINT "DMMessage_dMThreadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DMParticipant" DROP CONSTRAINT "DMParticipant_dMThreadId_fkey";

-- AlterTable
ALTER TABLE "DMMessage" DROP COLUMN "dMThreadId";

-- AlterTable
ALTER TABLE "DMParticipant" DROP COLUMN "dMThreadId";

-- AddForeignKey
ALTER TABLE "DMParticipant" ADD CONSTRAINT "DMParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DMThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DMMessage" ADD CONSTRAINT "DMMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DMThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
