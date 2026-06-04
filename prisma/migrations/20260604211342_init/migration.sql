-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sport" TEXT,
    "structure" TEXT,
    "totalDistance" DOUBLE PRECISION,
    "totalTime" DOUBLE PRECISION,
    "avgHR" INTEGER,
    "data" JSONB NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");
