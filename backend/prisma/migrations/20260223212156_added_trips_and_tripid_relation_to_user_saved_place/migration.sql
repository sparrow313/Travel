/*
  Warnings:

  - Added the required column `tripId` to the `UserSavedPlace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserSavedPlace" ADD COLUMN     "tripId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserSavedPlace" ADD CONSTRAINT "UserSavedPlace_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
