-- CreateEnum
CREATE TYPE "Status" AS ENUM ('WISHLIST', 'VISITED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bio" TEXT NOT NULL,
    "currentlyVisiting" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

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
    "plusCode" JSONB,
    "viewport" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GooglePlaceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedPlace" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'WISHLIST',
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSavedPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

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
CREATE INDEX "UserSavedPlace_status_idx" ON "UserSavedPlace"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedPlace_userId_placeId_key" ON "UserSavedPlace"("userId", "placeId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_placeId_idx" ON "Review"("placeId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_placeId_key" ON "Review"("userId", "placeId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GooglePlaceCache" ADD CONSTRAINT "GooglePlaceCache_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("placeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPlace" ADD CONSTRAINT "UserSavedPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedPlace" ADD CONSTRAINT "UserSavedPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("placeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("placeId") ON DELETE CASCADE ON UPDATE CASCADE;
