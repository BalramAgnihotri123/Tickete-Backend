-- CreateTable
CREATE TABLE "CronJob" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastExecuted" TIMESTAMP(3),
    "nextExecution" TIMESTAMP(3),

    CONSTRAINT "CronJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CronJob_name_key" ON "CronJob"("name");
