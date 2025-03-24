/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `Pax` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pax_type_key" ON "Pax"("type");
