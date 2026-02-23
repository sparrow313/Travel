/*
  Warnings:

  - Added the required column `updatedAt` to the `UserSavedPlace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add updatedAt with a default value for existing rows
ALTER TABLE "UserSavedPlace" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add visitedAt column (nullable, so no issue)
ALTER TABLE "UserSavedPlace" ADD COLUMN     "visitedAt" TIMESTAMP(3);

-- Remove the default from updatedAt (it will be managed by @updatedAt in Prisma)
ALTER TABLE "UserSavedPlace" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "UserSavedPlace_visitedAt_idx" ON "UserSavedPlace"("visitedAt");
