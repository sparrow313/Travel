-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('FOOD_DRINK', 'STAY', 'SIGHTSEEING', 'NATURE', 'SHOPPING', 'NIGHTLIFE', 'WELLNESS', 'OTHER');

-- AlterTable
ALTER TABLE "UserSavedPlace" ADD COLUMN     "category" "PlaceCategory" NOT NULL DEFAULT 'OTHER';
