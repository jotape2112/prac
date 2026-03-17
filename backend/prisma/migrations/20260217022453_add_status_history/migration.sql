-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOCENTE', 'ESTUDIANTE', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('I', 'II');

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('PENDIENTE_SOLICITUD', 'SOLICITUD_APROBADA', 'EN_DESARROLLO', 'EN_REVISION_FINAL', 'FINALIZADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nrc" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "practiceType" "PracticeType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "periodId" INTEGER NOT NULL,
    "docenteId" INTEGER NOT NULL,

    CONSTRAINT "Nrc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practice" (
    "id" SERIAL NOT NULL,
    "status" "PracticeStatus" NOT NULL DEFAULT 'PENDIENTE_SOLICITUD',
    "notaFinal" DOUBLE PRECISION,
    "numeroActa" TEXT,
    "studentId" INTEGER NOT NULL,
    "nrcId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Nrc" ADD CONSTRAINT "Nrc_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nrc" ADD CONSTRAINT "Nrc_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_nrcId_fkey" FOREIGN KEY ("nrcId") REFERENCES "Nrc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
