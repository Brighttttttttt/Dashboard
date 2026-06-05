-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "fileHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workout_userId_fileHash_key" ON "Workout"("userId", "fileHash");
