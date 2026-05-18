-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Gestion Financière et Paie — BTP / Logistique
-- ═══════════════════════════════════════════════════════════════

-- 1. Types financiers et unités de facturation
CREATE TYPE IF NOT EXISTS invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE IF NOT EXISTS payroll_status AS ENUM ('pending', 'processed', 'paid', 'cancelled');
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('revenue', 'expense', 'salary', 'invoice_payment', 'tax', 'loan', 'transfer');
CREATE TYPE IF NOT EXISTS billing_unit AS ENUM ('forfait', 'ton_km', 'jour_equipe', 'heure_machine', 'm3_transport', 'km_tracte', 'unite');

-- 2. Table de configuration budgétaire et unités de facturation par site
CREATE TABLE IF NOT EXISTS budget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    site_id UUID,
    annual_budget NUMERIC(18, 2) NOT NULL DEFAULT 0,
    billing_unit billing_unit NOT NULL DEFAULT 'forfait',
    unit_description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(subsidiary_id, site_id)
);
CREATE INDEX IF NOT EXISTS idx_budget_settings_subsidiary ON budget_settings(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_budget_settings_site ON budget_settings(site_id);

-- 3. Table des factures de chantier et logistique
CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    client_id UUID REFERENCES user_profiles(id),
    site_id UUID,
    invoice_number VARCHAR(120) UNIQUE NOT NULL,
    billing_unit billing_unit NOT NULL DEFAULT 'forfait',
    unit_quantity NUMERIC(16, 4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.18,
    status invoice_status NOT NULL DEFAULT 'draft',
    description TEXT,
    details JSONB DEFAULT '{}',
    subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    due_date DATE,
    issued_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ,
    reference TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subsidiary ON billing_invoices(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_client ON billing_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_issued_at ON billing_invoices(issued_at DESC);

-- 4. Table de gestion de la paie avec retenues automatiques
CREATE TABLE IF NOT EXISTS payroll_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES user_profiles(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    gross_salary NUMERIC(18, 2) NOT NULL DEFAULT 0,
    deductions JSONB DEFAULT '[]'::JSONB,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.18,
    total_deductions NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax_withheld NUMERIC(18, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status payroll_status NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_management_subsidiary ON payroll_management(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_payroll_management_employee ON payroll_management(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_management_period ON payroll_management(pay_period_start, pay_period_end);

-- 5. Table des transactions financières
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    related_invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
    related_payroll_id UUID REFERENCES payroll_management(id) ON DELETE SET NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'XOF',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    category TEXT,
    payment_method TEXT,
    reference TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_subsidiary ON financial_transactions(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);

-- 6. Fonctions de calcul automatique
CREATE OR REPLACE FUNCTION calculate_invoice_totals(
    _unit_quantity NUMERIC,
    _unit_price NUMERIC,
    _discount_amount NUMERIC,
    _tax_rate NUMERIC
)
RETURNS TABLE(subtotal NUMERIC, tax_amount NUMERIC, total NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
    subtotal := ROUND(GREATEST(_unit_quantity * _unit_price - COALESCE(_discount_amount, 0), 0), 2);
    tax_amount := ROUND(GREATEST(subtotal * COALESCE(_tax_rate, 0), 0), 2);
    total := ROUND(subtotal + tax_amount, 2);
END;
$$;

CREATE OR REPLACE FUNCTION calculate_salary_deductions(
    _gross_salary NUMERIC,
    _deductions JSONB,
    _tax_rate NUMERIC
)
RETURNS TABLE(total_deductions NUMERIC, tax_withheld NUMERIC, net_salary NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
    deduction_row JSONB;
BEGIN
    total_deductions := COALESCE((SELECT SUM((elem->>'amount')::NUMERIC) FROM jsonb_array_elements(_deductions) AS elem), 0);
    tax_withheld := ROUND(GREATEST(_gross_salary * COALESCE(_tax_rate, 0), 0), 2);
    net_salary := ROUND(GREATEST(_gross_salary - total_deductions - tax_withheld, 0), 2);
END;
$$;

-- 7. Triggers d'intégrité pour calculs automatiques
CREATE OR REPLACE FUNCTION billing_invoice_totals_trigger()
RETURNS TRIGGER AS $$
DECLARE
    totals RECORD;
BEGIN
    SELECT * INTO totals FROM calculate_invoice_totals(NEW.unit_quantity, NEW.unit_price, NEW.discount_amount, NEW.tax_rate);
    NEW.subtotal_amount := totals.subtotal;
    NEW.tax_amount := totals.tax_amount;
    NEW.total_amount := totals.total;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS billing_invoice_totals ON billing_invoices;
CREATE TRIGGER billing_invoice_totals
BEFORE INSERT OR UPDATE ON billing_invoices
FOR EACH ROW EXECUTE FUNCTION billing_invoice_totals_trigger();

CREATE OR REPLACE FUNCTION payroll_net_salary_trigger()
RETURNS TRIGGER AS $$
DECLARE
    totals RECORD;
BEGIN
    SELECT * INTO totals FROM calculate_salary_deductions(NEW.gross_salary, COALESCE(NEW.deductions, '[]'::JSONB), NEW.tax_rate);
    NEW.total_deductions := totals.total_deductions;
    NEW.tax_withheld := totals.tax_withheld;
    NEW.net_salary := totals.net_salary;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payroll_net_salary ON payroll_management;
CREATE TRIGGER payroll_net_salary
BEFORE INSERT OR UPDATE ON payroll_management
FOR EACH ROW EXECUTE FUNCTION payroll_net_salary_trigger();
