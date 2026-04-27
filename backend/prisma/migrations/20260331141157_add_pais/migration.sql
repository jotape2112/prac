/*
  Warnings:

  - You are about to drop the column `empresaComuna` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `empresaRegion` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `rut` on the `Practice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Practice" DROP COLUMN "empresaComuna",
DROP COLUMN "empresaRegion",
DROP COLUMN "rut",
ADD COLUMN     "empresaPais" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rut" TEXT;
