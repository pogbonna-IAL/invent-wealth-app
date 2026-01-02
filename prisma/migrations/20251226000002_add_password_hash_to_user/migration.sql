-- AlterTable
-- Add passwordHash column to User table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'passwordHash'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
    END IF;
END $$;

