-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "evaluadorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
