-- CreateTable
CREATE TABLE "InstagramSave" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "instagramUrl" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "sourceHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramSave_userId_idx" ON "InstagramSave"("userId");

-- AddForeignKey
ALTER TABLE "InstagramSave" ADD CONSTRAINT "InstagramSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
