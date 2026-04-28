-- ============================================
-- Migration: International Expansion
-- Countries, Sites & Currency Management
-- ============================================

-- 1. Countries table
CREATE TABLE IF NOT EXISTS countries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  code_iso      VARCHAR(3) NOT NULL UNIQUE,       -- ISO 3166-1 alpha-3 (SEN, GIN, CIV…)
  currency_code VARCHAR(3) NOT NULL DEFAULT 'XOF', -- ISO 4217 (XOF, GNF, EUR…)
  currency_symbol TEXT NOT NULL DEFAULT 'F CFA',   -- Display symbol
  flag_emoji    TEXT DEFAULT '🏳️',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Sites table (factories / operational sites)
CREATE TABLE IF NOT EXISTS sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          VARCHAR(10) NOT NULL UNIQUE,       -- Short code: DKR, CKY, ABJ…
  country_id    UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Extend user_profiles with country/site assignment
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id),
  ADD COLUMN IF NOT EXISTS site_id    UUID REFERENCES sites(id);

-- 4. Add currency_code to transaction tables for historical integrity
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'XOF';

-- Fuel transactions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_transactions') THEN
    EXECUTE 'ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''XOF''';
  END IF;
END $$;

-- Finance / invoices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''XOF''';
  END IF;
END $$;

-- HR payroll
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll') THEN
    EXECUTE 'ALTER TABLE payroll ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT ''XOF''';
  END IF;
END $$;

-- 5. Exchange rates table (for consolidated dashboard)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL DEFAULT 'XOF',  -- Reference currency
  rate            NUMERIC(12,6) NOT NULL,              -- 1 source = rate × target
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_currency, target_currency, effective_date)
);

-- 6. Triggers for updated_at
CREATE TRIGGER set_countries_updated_at BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS policies
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Countries: readable by all authenticated, writable by super_admin
CREATE POLICY countries_read ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY countries_write ON countries FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role = 'super_admin')
  );

-- Sites: users see only their assigned site, super_admin sees all
CREATE POLICY sites_read ON sites FOR SELECT TO authenticated
  USING (
    id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role = 'super_admin')
  );
CREATE POLICY sites_write ON sites FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role = 'super_admin')
  );

-- Exchange rates: readable by all, writable by super_admin
CREATE POLICY exchange_rates_read ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY exchange_rates_write ON exchange_rates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND user_role = 'super_admin')
  );

-- 8. Seed default data (Sénégal)
INSERT INTO countries (name, code_iso, currency_code, currency_symbol, flag_emoji)
VALUES ('Sénégal', 'SEN', 'XOF', 'F CFA', '🇸🇳')
ON CONFLICT (code_iso) DO NOTHING;

INSERT INTO sites (name, code, country_id)
SELECT 'Dakar (Siège)', 'DKR', id FROM countries WHERE code_iso = 'SEN'
ON CONFLICT (code) DO NOTHING;
