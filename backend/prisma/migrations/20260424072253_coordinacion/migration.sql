-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StartDocStatus" ADD VALUE 'EN_REVISION_COORDINACION';
ALTER TYPE "StartDocStatus" ADD VALUE 'OBSERVADO_COORDINACION';

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "funcionesAlumno" TEXT,
ADD COLUMN     "funcionesNotes" TEXT;
