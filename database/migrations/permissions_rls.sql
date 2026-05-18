-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Sécurité API — RLS & Permissions côté base de données
-- ═══════════════════════════════════════════════════════════════
-- Les permissions NE doivent PAS être gérées uniquement côté client.
-- Chaque requête API vérifie le rôle et les permissions en base.

-- 1. Table des rôles et permissions utilisateurs
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Utilisateur' CHECK (role IN ('SuperAdmin', 'Admin', 'Utilisateur')),
    module TEXT NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'view', 'edit', 'all')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, module)
);

CREATE TABLE IF NOT EXISTS user_route_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    route_path TEXT NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'view', 'edit', 'all')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, route_path)
);

CREATE INDEX IF NOT EXISTS idx_user_route_permissions_user ON user_route_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_route_permissions_route ON user_route_permissions(route_path);

-- 2. Table des logs d'audit (serveur)
CREATE TABLE IF NOT EXISTS audit_logs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'permission_change', 'role_change', 'approval', 'rejection', 'critical_action')),
    module TEXT,
    entity TEXT,
    entity_id TEXT,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_audit_logs_v2_user ON audit_logs_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_v2_action ON audit_logs_v2(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_v2_severity ON audit_logs_v2(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_v2_created ON audit_logs_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_v2_module ON audit_logs_v2(module);

-- 3. Table des actions critiques en attente d'approbation
CREATE TABLE IF NOT EXISTS critical_action_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_by_name TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('salary_change', 'data_deletion', 'permission_change', 'role_change', 'bulk_delete', 'config_change')),
    module TEXT,
    description TEXT,
    payload JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_critical_requests_status ON critical_action_requests(status);

-- ═══════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS) — Vérification serveur
-- ═══════════════════════════════════════════════════════════════

-- Helper function: get user role from user_permissions
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM user_permissions WHERE user_id = uid LIMIT 1),
    'Utilisateur'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if user has permission on a module
CREATE OR REPLACE FUNCTION has_permission(uid UUID, p_module TEXT, required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_level TEXT;
BEGIN
  -- SuperAdmin has all access
  user_role := get_user_role(uid);
  IF user_role = 'SuperAdmin' THEN RETURN TRUE; END IF;

  -- Check specific permission
  SELECT permission_level INTO user_level
  FROM user_permissions
  WHERE user_id = uid AND module = p_module;

  IF user_level IS NULL THEN
    -- Default permissions based on role
    IF user_role = 'Admin' THEN
      IF p_module = 'parametres' THEN user_level := 'view';
      ELSE user_level := 'all'; END IF;
    ELSE
      IF p_module = 'parametres' THEN RETURN FALSE;
      ELSE user_level := 'view'; END IF;
    END IF;
  END IF;

  -- Permission hierarchy: none < view < edit < all
  IF user_level = 'none' THEN RETURN FALSE; END IF;
  IF user_level = 'all' THEN RETURN TRUE; END IF;
  IF user_level = 'edit' THEN RETURN required_level IN ('view', 'edit'); END IF;
  IF user_level = 'view' THEN RETURN required_level = 'view'; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on user_permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- SuperAdmin can do everything on user_permissions
CREATE POLICY "superadmin_full_access_permissions" ON user_permissions
    FOR ALL USING (get_user_role(auth.uid()) = 'SuperAdmin');

-- Users can read their own permissions
CREATE POLICY "users_read_own_permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

-- Enable RLS on user_route_permissions
ALTER TABLE user_route_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_full_access_route_permissions" ON user_route_permissions
    FOR ALL USING (get_user_role(auth.uid()) = 'SuperAdmin');

CREATE POLICY "users_read_own_route_permissions" ON user_route_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "superadmin_insert_route_permissions" ON user_route_permissions
    FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'SuperAdmin');

CREATE POLICY "superadmin_update_route_permissions" ON user_route_permissions
    FOR UPDATE USING (get_user_role(auth.uid()) = 'SuperAdmin') WITH CHECK (get_user_role(auth.uid()) = 'SuperAdmin');

CREATE POLICY "superadmin_delete_route_permissions" ON user_route_permissions
    FOR DELETE USING (get_user_role(auth.uid()) = 'SuperAdmin');

CREATE POLICY "users_insert_own_route_permissions" ON user_route_permissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_route_permissions" ON user_route_permissions
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Enable RLS on audit_logs_v2
ALTER TABLE audit_logs_v2 ENABLE ROW LEVEL SECURITY;

-- Only SuperAdmin can read audit logs
CREATE POLICY "superadmin_read_audit" ON audit_logs_v2
    FOR SELECT USING (get_user_role(auth.uid()) = 'SuperAdmin');

-- Any authenticated user can insert audit logs (via the app)
CREATE POLICY "authenticated_insert_audit" ON audit_logs_v2
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on critical_action_requests
ALTER TABLE critical_action_requests ENABLE ROW LEVEL SECURITY;

-- SuperAdmin can do everything on critical actions
CREATE POLICY "superadmin_full_access_critical" ON critical_action_requests
    FOR ALL USING (get_user_role(auth.uid()) = 'SuperAdmin');

-- Users can see their own requests
CREATE POLICY "users_read_own_critical" ON critical_action_requests
    FOR SELECT USING (requested_by = auth.uid());

-- Users can create requests
CREATE POLICY "users_create_critical" ON critical_action_requests
    FOR INSERT WITH CHECK (requested_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 5. Trigger: auto-log mutations dans audit_logs_v2
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs_v2 (user_id, action, module, entity, entity_id, old_value, new_value, severity)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW), 'medium');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs_v2 (user_id, action, module, entity, entity_id, old_value, severity)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD), 'high');
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs_v2 (user_id, action, module, entity, entity_id, new_value, severity)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW), 'low');
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply auto-audit trigger to key tables (add more as needed)
-- Example: DROP TRIGGER IF EXISTS audit_vehicles ON vehicles; CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION auto_audit_trigger();
-- Example: DROP TRIGGER IF EXISTS audit_missions ON missions; CREATE TRIGGER audit_missions AFTER INSERT OR UPDATE OR DELETE ON missions FOR EACH ROW EXECUTE FUNCTION auto_audit_trigger();

-- 6. RLS pour les données financières
CREATE OR REPLACE FUNCTION get_user_subsidiary(uid UUID)
RETURNS UUID AS $$
  SELECT subsidiary_id FROM user_profiles WHERE id = uid LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT get_user_role(uid) = 'SuperAdmin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_settings_select" ON budget_settings
  FOR SELECT USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "budget_settings_insert" ON budget_settings
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "budget_settings_update" ON budget_settings
  FOR UPDATE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "budget_settings_delete" ON budget_settings
  FOR DELETE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_invoices_select" ON billing_invoices
  FOR SELECT USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "billing_invoices_insert" ON billing_invoices
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "billing_invoices_update" ON billing_invoices
  FOR UPDATE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "billing_invoices_delete" ON billing_invoices
  FOR DELETE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));

ALTER TABLE payroll_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_management_select" ON payroll_management
  FOR SELECT USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "payroll_management_insert" ON payroll_management
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "payroll_management_update" ON payroll_management
  FOR UPDATE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "payroll_management_delete" ON payroll_management
  FOR DELETE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_transactions_select" ON financial_transactions
  FOR SELECT USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "financial_transactions_insert" ON financial_transactions
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "financial_transactions_update" ON financial_transactions
  FOR UPDATE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));
CREATE POLICY "financial_transactions_delete" ON financial_transactions
  FOR DELETE USING (is_super_admin(auth.uid()) OR subsidiary_id = get_user_subsidiary(auth.uid()));

