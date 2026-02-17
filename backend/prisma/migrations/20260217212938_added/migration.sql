/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_id_fkey";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GooglePlaceCache" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "addressJson" JSONB,
    "types" JSONB,
    "plusCode" TEXT,
    "viewport" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GooglePlaceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedPlace" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_placeId_key" ON "Place"("placeId");

-- CreateIndex
CREATE INDEX "Place_placeId_idx" ON "Place"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "GooglePlaceCache_placeId_key" ON "GooglePlaceCache"("placeId");

-- CreateIndex
CREATE INDEX "GooglePlaceCache_fetchedAt_idx" ON "GooglePlaceCache"("fetchedAt");

-- CreateIndex
CREATE INDEX "UserSavedPlace_userId_idx" ON "UserSavedPlace"("userId");

-- CreateIndex
CREATE INDEX "UserSavedPlace_placeId_idx" ON "UserSavedPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedPlace_userId_placeId_key" ON "UserSavedPlace"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GooglePlaceCache" ADD CONSTRAINT "GooglePlaceCache_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("placeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPlace" ADD CONSTRAINT "UserSavedPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPlace" ADD CONSTRAINT "UserSavedPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("placeId") ON DELETE CASCADE ON UPDATE CASCADE;
