-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "hasItinerary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3);
