-- AlterEnum
-- Add new values to DistributionStatus enum
ALTER TYPE "DistributionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "DistributionStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "DistributionStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- AlterTable
ALTER TABLE "Distribution" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Distribution" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Distribution" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

