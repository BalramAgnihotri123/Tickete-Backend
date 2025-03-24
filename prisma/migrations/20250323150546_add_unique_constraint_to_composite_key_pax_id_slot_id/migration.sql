/*
  Warnings:

  - A unique constraint covering the columns `[paxId,slotId]` on the table `PaxAvailability` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PaxAvailability_paxId_slotId_key" ON "PaxAvailability"("paxId", "slotId");
