/*
  Warnings:

  - A unique constraint covering the columns `[slotId,paxId]` on the table `PaxAvailability` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PaxAvailability_paxId_slotId_key";

-- CreateIndex
CREATE UNIQUE INDEX "PaxAvailability_slotId_paxId_key" ON "PaxAvailability"("slotId", "paxId");
