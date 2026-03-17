/*
  Warnings:

  - The values [SOLICITUD_APROBADA,EN_REVISION_FINAL] on the enum `PracticeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `companyAddress` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `supervisorName` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `supervisorPhone` on the `Practice` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PracticeStatus_new" AS ENUM ('BORRADOR', 'PROCESSING_DOCUMENT', 'BORRADOR_AUTO_COMPLETADO', 'PENDIENTE_SOLICITUD', 'RECHAZADA', 'APROBADA', 'EN_DESARROLLO', 'EXTENSION_SOLICITADA', 'FINALIZADA', 'CANCELADA');
ALTER TABLE "Practice" ALTER COLUMN "status" TYPE "PracticeStatus_new" USING ("status"::text::"PracticeStatus_new");
ALTER TYPE "PracticeStatus" RENAME TO "PracticeStatus_old";
ALTER TYPE "PracticeStatus_new" RENAME TO "PracticeStatus";
DROP TYPE "PracticeStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Practice" DROP COLUMN "companyAddress",
DROP COLUMN "companyName",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "supervisorName",
DROP COLUMN "supervisorPhone",
ADD COLUMN     "documentoExtension" TEXT,
ADD COLUMN     "documentoInicio" TEXT,
ADD COLUMN     "empresaCiudad" TEXT,
ADD COLUMN     "empresaComuna" TEXT,
ADD COLUMN     "empresaDireccion" TEXT,
ADD COLUMN     "empresaEmail" TEXT,
ADD COLUMN     "empresaNombre" TEXT,
ADD COLUMN     "empresaRegion" TEXT,
ADD COLUMN     "empresaTelefono" TEXT,
ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "ocrError" TEXT,
ADD COLUMN     "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supervisorCargo" TEXT,
ADD COLUMN     "supervisorFono" TEXT,
ADD COLUMN     "supervisorNombre" TEXT;

-- CreateTable
CREATE TABLE "PracticeExtension" (
    "id" SERIAL NOT NULL,
    "practiceId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "documento" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeExtension_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PracticeExtension" ADD CONSTRAINT "PracticeExtension_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
