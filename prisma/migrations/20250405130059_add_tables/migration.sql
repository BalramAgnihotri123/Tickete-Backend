-- CreateEnum
CREATE TYPE "Day" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TimeSlotType" AS ENUM ('SINGLE', 'MULTI');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "availableDays" "Day"[],
    "timeSlotType" "TimeSlotType" NOT NULL DEFAULT 'SINGLE',

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "providerSlotId" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pax" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "min" INTEGER,
    "max" INTEGER,

    CONSTRAINT "Pax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaxAvailability" (
    "id" SERIAL NOT NULL,
    "remaining" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "paxId" INTEGER NOT NULL,
    "priceId" INTEGER NOT NULL,

    CONSTRAINT "PaxAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Slot_providerSlotId_key" ON "Slot"("providerSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "Pax_type_key" ON "Pax"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PaxAvailability_slotId_paxId_key" ON "PaxAvailability"("slotId", "paxId");

-- CreateIndex
CREATE UNIQUE INDEX "Price_finalPrice_originalPrice_currencyCode_key" ON "Price"("finalPrice", "originalPrice", "currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "CronJob_name_key" ON "CronJob"("name");

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxAvailability" ADD CONSTRAINT "PaxAvailability_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxAvailability" ADD CONSTRAINT "PaxAvailability_paxId_fkey" FOREIGN KEY ("paxId") REFERENCES "Pax"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxAvailability" ADD CONSTRAINT "PaxAvailability_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "Price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
