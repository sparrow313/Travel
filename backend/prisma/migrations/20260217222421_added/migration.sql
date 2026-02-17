/*
  Warnings:

  - The `plusCode` column on the `GooglePlaceCache` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "GooglePlaceCache" DROP COLUMN "plusCode",
ADD COLUMN     "plusCode" JSONB;
