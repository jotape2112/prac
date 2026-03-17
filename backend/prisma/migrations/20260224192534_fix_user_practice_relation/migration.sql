/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `notaFinal` on the `Practice` table. All the data in the column will be lost.
  - You are about to drop the column `numeroActa` on the `Practice` table. All the data in the column will be lost.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "practiceId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Practice" DROP COLUMN "createdAt",
DROP COLUMN "notaFinal",
DROP COLUMN "numeroActa",
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "supervisorEmail" TEXT,
ADD COLUMN     "supervisorName" TEXT,
ADD COLUMN     "supervisorPhone" TEXT,
ALTER COLUMN "status" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
