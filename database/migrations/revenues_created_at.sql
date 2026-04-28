-- Add temporal traceability for revenues entries
-- Safe migration: apply if a revenues-like table already exists.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenues') THEN
        EXECUTE 'ALTER TABLE revenues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_revenues_created_at ON revenues(created_at)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'finance_revenues') THEN
        EXECUTE 'ALTER TABLE finance_revenues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_finance_revenues_created_at ON finance_revenues(created_at)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_revenues') THEN
        EXECUTE 'ALTER TABLE manual_revenues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_manual_revenues_created_at ON manual_revenues(created_at)';
    END IF;
END $$;
