-- CreateEnum
CREATE TYPE "PracticeDocumentType" AS ENUM ('INICIO_PDF', 'INICIO_FIRMADO_PDF', 'INFORME_100H_WORD', 'INFORME_FINAL_WORD', 'EXTENSION_PDF');

-- CreateEnum
CREATE TYPE "StartDocStatus" AS ENUM ('SUBIDO_POR_ESTUDIANTE', 'EN_REVISION_SECRETARIA', 'OBSERVADO_SECRETARIA', 'VALIDADO_SECRETARIA', 'EN_FIRMA_DIRECTOR', 'FIRMADO_DIRECTOR', 'PUBLICADO_POR_SECRETARIA');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('HORAS_100', 'FINAL');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDIENTE', 'OBSERVADO', 'EVALUADO');

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "empresaGiro" TEXT,
ADD COLUMN     "empresaRut" TEXT,
ADD COLUMN     "startDocNotes" TEXT,
ADD COLUMN     "startDocStatus" "StartDocStatus" NOT NULL DEFAULT 'SUBIDO_POR_ESTUDIANTE',
ADD COLUMN     "supervisorCarta" TEXT,
ADD COLUMN     "supervisorCartaEmail" TEXT,
ADD COLUMN     "supervisorCartaFono" TEXT;

-- CreateTable
CREATE TABLE "PracticeDocument" (
    "id" SERIAL NOT NULL,
    "practiceId" INTEGER NOT NULL,
    "type" "PracticeDocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeEvaluation" (
    "id" SERIAL NOT NULL,
    "practiceId" INTEGER NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "grade" DOUBLE PRECISION,
    "observations" TEXT,
    "reviewedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "nrcId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "formativesDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeDocument_practiceId_type_idx" ON "PracticeDocument"("practiceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeEvaluation_practiceId_type_key" ON "PracticeEvaluation"("practiceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_periodId_nrcId_studentId_key" ON "Enrollment"("periodId", "nrcId", "studentId");

-- AddForeignKey
ALTER TABLE "PracticeDocument" ADD CONSTRAINT "PracticeDocument_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeDocument" ADD CONSTRAINT "PracticeDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvaluation" ADD CONSTRAINT "PracticeEvaluation_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvaluation" ADD CONSTRAINT "PracticeEvaluation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_nrcId_fkey" FOREIGN KEY ("nrcId") REFERENCES "Nrc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
