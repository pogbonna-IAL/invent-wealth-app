-- CreateEnum (if it doesn't exist)
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE TYPE, so we check first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        -- Create enum with all values including WALLET
        CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHECK', 'WIRE_TRANSFER', 'MOBILE_MONEY', 'CASH', 'OTHER', 'WALLET');
    ELSE
        -- Enum exists, just add WALLET if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'WALLET' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')
        ) THEN
            ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';
        END IF;
    END IF;
END $$;

-- Add paymentMethod column to Payout table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Payout' AND column_name = 'paymentMethod'
    ) THEN
        ALTER TABLE "Payout" ADD COLUMN "paymentMethod" "PaymentMethod";
    END IF;
END $$;

-- Add paymentReference column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Payout' AND column_name = 'paymentReference'
    ) THEN
        ALTER TABLE "Payout" ADD COLUMN "paymentReference" TEXT;
    END IF;
END $$;

-- Add bankAccount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Payout' AND column_name = 'bankAccount'
    ) THEN
        ALTER TABLE "Payout" ADD COLUMN "bankAccount" TEXT;
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Payout' AND column_name = 'notes'
    ) THEN
        ALTER TABLE "Payout" ADD COLUMN "notes" TEXT;
    END IF;
END $$;

