/*
  Warnings:

  - You are about to drop the column `addressJson` on the `GooglePlaceCache` table. All the data in the column will be lost.
  - You are about to drop the column `formattedAddress` on the `GooglePlaceCache` table. All the data in the column will be lost.
  - You are about to drop the column `plusCode` on the `GooglePlaceCache` table. All the data in the column will be lost.
  - You are about to drop the column `types` on the `GooglePlaceCache` table. All the data in the column will be lost.
  - You are about to drop the column `viewport` on the `GooglePlaceCache` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Place` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,placeId,tripId]` on the table `UserSavedPlace` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lat` to the `GooglePlaceCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `GooglePlaceCache` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserSavedPlace_userId_placeId_key";

-- AlterTable
ALTER TABLE "GooglePlaceCache" DROP COLUMN "addressJson",
DROP COLUMN "formattedAddress",
DROP COLUMN "plusCode",
DROP COLUMN "types",
DROP COLUMN "viewport",
ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "lat",
DROP COLUMN "lng";

-- CreateIndex
CREATE INDEX "UserSavedPlace_tripId_idx" ON "UserSavedPlace"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedPlace_userId_placeId_tripId_key" ON "UserSavedPlace"("userId", "placeId", "tripId");
