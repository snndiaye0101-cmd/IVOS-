-- ============================================
-- IVOS - Schéma Base de Données Supabase
-- Application SaaS Multi-Tenant de Gestion de Flotte
-- ============================================

-- Extension UUID pour les clés primaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ARCHITECTURE MULTI-TENANT & ORGANISATIONS
-- ============================================

-- Table des Pays/Filiales (Tenants)
CREATE TABLE subsidiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    country_name VARCHAR(100) NOT NULL,
    legal_entity VARCHAR(255),
    tax_id VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency_code VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_subsidiaries_country ON subsidiaries(country_code);
CREATE INDEX idx_subsidiaries_active ON subsidiaries(is_active);

-- ============================================
-- 2. GESTION DES UTILISATEURS & RBAC
-- ============================================

-- Types de rôles (Enum)
CREATE TYPE user_role AS ENUM (
    'super_admin',      -- Admin Global
    'country_manager',  -- Manager Pays
    'dispatcher',       -- Dispatcher/Coordinateur
    'driver',           -- Chauffeur
    'client',           -- Client/Partenaire
    'supervisor'        -- Superviseur de site
);

-- Statuts utilisateur
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Table des Profils Utilisateurs (Étendue de auth.users de Supabase)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'driver',
    status user_status DEFAULT 'active',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    employee_id VARCHAR(50),
    
    -- Métadonnées
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_user_profiles_subsidiary ON user_profiles(subsidiary_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- 3. GESTION DE FLOTTE - VÉHICULES
-- ============================================

-- Types de véhicules
CREATE TYPE vehicle_type AS ENUM (
    'truck',
    'van',
    'tanker',
    'trailer',
    'compactor',
    'other'
);

-- Statuts véhicule
CREATE TYPE vehicle_status AS ENUM (
    'available',
    'in_mission',
    'maintenance',
    'out_of_service'
);

-- Table des Véhicules
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    
    -- Informations véhicule
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    type vehicle_type NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    vin VARCHAR(17), -- Vehicle Identification Number
        -- Champs ajoutés pour véhicule de service et agent assigné
        service_vehicle BOOLEAN DEFAULT false, -- Indique si c'est un véhicule de service
        assigned_agent_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- Agent assigné au véhicule de service
        service_notes TEXT, -- Informations complémentaires sur l'affectation/service
    -- Capacités
    capacity_weight_kg DECIMAL(10, 2),
    capacity_volume_m3 DECIMAL(10, 2),
    fuel_type VARCHAR(50),
    
    -- Statut et maintenance
    status vehicle_status DEFAULT 'available',
    next_maintenance_date DATE,
    last_maintenance_date DATE,
    odometer_km DECIMAL(10, 2) DEFAULT 0,
    
    -- Documents
    insurance_expiry DATE,
    registration_expiry DATE,
    technical_inspection_expiry DATE,
    
    -- Métadonnées
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_vehicles_subsidiary ON vehicles(subsidiary_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);

-- ============================================
-- 4. GESTION DE FLOTTE - CHAUFFEURS
-- ============================================

-- Statuts chauffeur
CREATE TYPE driver_status AS ENUM ('available', 'on_mission', 'off_duty', 'suspended');

-- Table des Chauffeurs
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    
    -- Informations conducteur
    driver_license_number VARCHAR(100) NOT NULL,
    license_type VARCHAR(50), -- A, B, C, D, E, etc.
    license_expiry DATE NOT NULL,
    
    -- Certifications
    hazmat_certified BOOLEAN DEFAULT false,
    hazmat_expiry DATE,
    forklift_certified BOOLEAN DEFAULT false,
    other_certifications JSONB DEFAULT '[]',
    
    -- Statut
    status driver_status DEFAULT 'available',
    current_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Métadonnées
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, subsidiary_id)
);

-- Index
CREATE INDEX idx_drivers_subsidiary ON drivers(subsidiary_id);
CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_current_vehicle ON drivers(current_vehicle_id);

-- ============================================
-- 5. GESTION DES CLIENTS/PARTENAIRES
-- ============================================

-- Types de clients
CREATE TYPE client_type AS ENUM ('producer', 'receiver', 'both');

-- Table des Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    
    -- Informations entreprise
    company_name VARCHAR(255) NOT NULL,
    client_type client_type NOT NULL,
    tax_id VARCHAR(100),
    
    -- Contact principal
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    
    -- Adresse
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    gps_coordinates POINT,
    
    -- Informations métier
    industry_sector VARCHAR(100),
    certification_numbers JSONB DEFAULT '{}', -- Ex: {"iso": "ISO 14001", "waste_producer_id": "WP123"}
    
    -- Statut
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_clients_subsidiary ON clients(subsidiary_id);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_company ON clients(company_name);

-- ============================================
-- 6. GESTION DES MISSIONS (ORDRES DE MISSION)
-- ============================================

-- Statuts de mission
CREATE TYPE mission_status AS ENUM (
    'draft',
    'validated',
    'in_progress',
    'completed',
    'closed',
    'cancelled'
);

-- Types de mission
CREATE TYPE mission_type AS ENUM (
    'waste_collection',
    'delivery',
    'transfer',
    'other'
);

-- Table des Missions
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    
    -- Références
    mission_number VARCHAR(50) UNIQUE NOT NULL,
    mission_type mission_type NOT NULL DEFAULT 'waste_collection',
    status mission_status DEFAULT 'draft',
    
    -- Ressources assignées
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    
    -- Origine et destination
    origin_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    destination_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Informations de route
    planned_start_date TIMESTAMP WITH TIME ZONE,
    planned_end_date TIMESTAMP WITH TIME ZONE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Kilomètres
    planned_distance_km DECIMAL(10, 2),
    actual_distance_km DECIMAL(10, 2),
    
    -- Workflow d'approbation
    created_by UUID REFERENCES user_profiles(id),
    validated_by UUID REFERENCES user_profiles(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    description TEXT,
    special_instructions TEXT,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE,
    archived_year INT
);

-- Table des Bordereaux de Suivi des Déchets (BSD)
-- Ajout des champs d'archivage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'waste_tracking_forms') THEN
        EXECUTE 'ALTER TABLE waste_tracking_forms ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE';
        EXECUTE 'ALTER TABLE waste_tracking_forms ADD COLUMN IF NOT EXISTS archived_year INT';
    END IF;
END $$;
-- Table des Factures
-- Ajout des champs d'archivage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        EXECUTE 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE';
        EXECUTE 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived_year INT';
    END IF;
END $$;
-- Fonction de clôture annuelle (archivage)
CREATE OR REPLACE FUNCTION cloture_annuelle(exercice INT) RETURNS VOID AS $$
BEGIN
    -- Missions
    UPDATE missions SET archived = TRUE, archived_year = exercice WHERE EXTRACT(YEAR FROM planned_start_date) = exercice AND archived = FALSE;
    -- BSD
    UPDATE waste_tracking_forms SET archived = TRUE, archived_year = exercice WHERE EXTRACT(YEAR FROM created_at) = exercice AND archived = FALSE;
    -- Factures
    UPDATE invoices SET archived = TRUE, archived_year = exercice WHERE EXTRACT(YEAR FROM created_at) = exercice AND archived = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APP TABLES (SOURCE DE VÉRITÉ FRONT)
-- ============================================

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(100) NOT NULL DEFAULT 'Utilisateur',
    fonction VARCHAR(255) DEFAULT '',
    photo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    site_access_blocked BOOLEAN DEFAULT false,
    system_access_blocked BOOLEAN DEFAULT false,
    country_id UUID,
    site_id UUID,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

CREATE TABLE IF NOT EXISTS app_user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    login_at TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_user_sessions_user ON app_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_sessions_login ON app_user_sessions(login_at);

CREATE TABLE IF NOT EXISTS app_user_activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_user_activity_user ON app_user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_activity_ts ON app_user_activity_logs(timestamp);

CREATE TABLE IF NOT EXISTS app_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration VARCHAR(100) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_vehicles_registration ON app_vehicles(registration);

CREATE TABLE IF NOT EXISTS app_maintenance_plans (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_maintenance_plans_updated_at ON app_maintenance_plans(updated_at);

CREATE TABLE IF NOT EXISTS app_insurance_contracts (
    id TEXT PRIMARY KEY,
    vehicule VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_insurance_vehicule ON app_insurance_contracts(vehicule);

-- Index
CREATE INDEX idx_missions_subsidiary ON missions(subsidiary_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_vehicle ON missions(vehicle_id);
CREATE INDEX idx_missions_driver ON missions(driver_id);
CREATE INDEX idx_missions_number ON missions(mission_number);
CREATE INDEX idx_missions_dates ON missions(planned_start_date, planned_end_date);

-- ============================================
-- 7. BORDEREAU DE SUIVI DES DÉCHETS (BSD)
-- ============================================

-- Types de déchets
CREATE TYPE waste_state AS ENUM ('gaseous', 'liquid', 'solid', 'sludge', 'mixed');

-- Types de conditionnement
CREATE TYPE packaging_type AS ENUM (
    'skip',        -- Benne
    'tanker',      -- Citerne
    'drum',        -- Fût
    'bag',         -- Sac
    'bulk',        -- Vrac
    'container',   -- Conteneur
    'other'
);

-- Statut d'acceptation à destination
CREATE TYPE acceptance_status AS ENUM ('pending', 'accepted', 'rejected', 'partial');

-- Table principale des Bordereaux
CREATE TABLE waste_tracking_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    
    -- Numéro unique du bordereau
    form_number VARCHAR(50) UNIQUE NOT NULL,
    form_version INTEGER DEFAULT 1,
    
    -- ========================================
    -- SECTION A: PRODUCTEUR/CLIENT
    -- ========================================
    producer_client_id UUID REFERENCES clients(id),
    producer_name VARCHAR(255) NOT NULL,
    producer_address TEXT NOT NULL,
    producer_contact_name VARCHAR(255),
    producer_contact_phone VARCHAR(50),
    producer_contact_email VARCHAR(255),
    producer_ninea VARCHAR(50),
    
    -- ========================================
    -- SECTION B: CARACTÉRISATION DU DÉCHET
    -- ========================================
    waste_description TEXT NOT NULL,
    waste_state waste_state NOT NULL,
    waste_category_code VARCHAR(50), -- Code déchet (ex: 17 01 07)
    waste_category_name VARCHAR(255),
    
    -- Conditionnement
    packaging_type packaging_type NOT NULL,
    packaging_quantity INTEGER NOT NULL DEFAULT 1,
    packaging_description TEXT,
    
    -- Quantités
    estimated_weight_kg DECIMAL(10, 2),
    estimated_volume_m3 DECIMAL(10, 2),
    
    -- Caractéristiques de danger
    is_hazardous BOOLEAN DEFAULT false,
    un_number VARCHAR(10), -- Numéro ONU pour matières dangereuses
    danger_class VARCHAR(50),
    hazard_codes JSONB DEFAULT '[]', -- ["H301", "H311", etc.]
    
    -- ========================================
    -- SECTION C: COLLECTEUR/TRANSPORTEUR
    -- ========================================
    transporter_company_name VARCHAR(255) NOT NULL,
    transporter_license_number VARCHAR(100),
    transporter_vehicle_registration VARCHAR(50),
    transporter_driver_name VARCHAR(255),
    transporter_driver_license VARCHAR(100),
    
    -- Dates de collecte
    collection_date TIMESTAMP WITH TIME ZONE,
    collection_confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Signature transporteur
    transporter_signature_url TEXT,
    transporter_signed_by UUID REFERENCES user_profiles(id),
    transporter_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- ========================================
    -- SECTION D: INSTALLATION DE DESTINATION
    -- ========================================
    destination_client_id UUID REFERENCES clients(id),
    destination_facility_name VARCHAR(255) NOT NULL,
    destination_facility_address TEXT NOT NULL,
    destination_facility_license VARCHAR(100),
    
    -- Réception
    reception_date TIMESTAMP WITH TIME ZONE,
    actual_weight_kg DECIMAL(10, 2), -- Pesée réelle
    actual_volume_m3 DECIMAL(10, 2),
    
    -- Acceptation
    acceptance_status acceptance_status DEFAULT 'pending',
    acceptance_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    rejection_details JSONB DEFAULT '{}',
    
    -- Signature destination
    destination_signature_url TEXT,
    destination_signed_by UUID REFERENCES user_profiles(id),
    destination_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- ========================================
    -- SIGNATURES & VALIDATION
    -- ========================================
    
    -- Signature producteur
    producer_signature_url TEXT,
    producer_signed_by UUID REFERENCES user_profiles(id),
    producer_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Signature superviseur (validation finale)
    supervisor_signature_url TEXT,
    supervisor_signed_by UUID REFERENCES user_profiles(id),
    supervisor_signed_at TIMESTAMP WITH TIME ZONE,
    
    -- ========================================
    -- STATUT & WORKFLOW
    -- ========================================
    status mission_status DEFAULT 'draft',
    
    -- Génération PDF
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    pdf_webhook_triggered BOOLEAN DEFAULT false,
    
    -- Métadonnées
    notes TEXT,
    attachments JSONB DEFAULT '[]', -- Photos, documents annexes
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_wtf_subsidiary ON waste_tracking_forms(subsidiary_id);
CREATE INDEX idx_wtf_mission ON waste_tracking_forms(mission_id);
CREATE INDEX idx_wtf_form_number ON waste_tracking_forms(form_number);
CREATE INDEX idx_wtf_producer ON waste_tracking_forms(producer_client_id);
CREATE INDEX idx_wtf_destination ON waste_tracking_forms(destination_client_id);
CREATE INDEX idx_wtf_status ON waste_tracking_forms(status);
CREATE INDEX idx_wtf_collection_date ON waste_tracking_forms(collection_date);

-- ============================================
-- 8. HISTORIQUE DES SIGNATURES
-- ============================================

CREATE TABLE signature_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waste_tracking_form_id UUID NOT NULL REFERENCES waste_tracking_forms(id) ON DELETE CASCADE,
    
    signature_type VARCHAR(50) NOT NULL, -- 'producer', 'transporter', 'destination', 'supervisor'
    signed_by UUID NOT NULL REFERENCES user_profiles(id),
    signature_url TEXT NOT NULL,
    
    -- Métadonnées de signature
    ip_address INET,
    user_agent TEXT,
    gps_location POINT,
    device_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signature_logs_form ON signature_logs(waste_tracking_form_id);
CREATE INDEX idx_signature_logs_user ON signature_logs(signed_by);

-- ============================================
-- 9. DOCUMENTS & FICHIERS
-- ============================================

CREATE TYPE document_category AS ENUM (
    'vehicle_registration',
    'insurance',
    'driver_license',
    'waste_manifest',
    'delivery_note',
    'photo',
    'other'
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    
    -- Relations polymorphiques
    entity_type VARCHAR(50) NOT NULL, -- 'vehicle', 'driver', 'mission', 'waste_form', 'client'
    entity_id UUID NOT NULL,
    
    -- Informations du document
    category document_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path dans Supabase Storage
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Métadonnées
    expiry_date DATE,
    uploaded_by UUID REFERENCES user_profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_subsidiary ON documents(subsidiary_id);

-- ============================================
-- 10. NOTIFICATIONS & WEBHOOKS
-- ============================================

CREATE TYPE notification_type AS ENUM (
    'mission_assigned',
    'mission_completed',
    'document_expiring',
    'waste_form_signed',
    'maintenance_due',
    'other'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Données contextuelles
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Statut
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Table pour tracer les webhooks vers n8n
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- 'pdf_generation', 'notification_send', etc.
    entity_type VARCHAR(50),
    entity_id UUID,
    
    webhook_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_entity ON webhook_logs(entity_type, entity_id);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);

-- ============================================
-- 11. AUDIT TRAIL
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Action
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'SIGN', etc.
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Données
    old_data JSONB,
    new_data JSONB,
    changes JSONB, -- Diff spécifique
    
    -- Contexte
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- 12. FONCTIONS & TRIGGERS
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables pertinentes
CREATE TRIGGER update_subsidiaries_updated_at BEFORE UPDATE ON subsidiaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waste_tracking_forms_updated_at BEFORE UPDATE ON waste_tracking_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer un numéro de mission unique
CREATE OR REPLACE FUNCTION generate_mission_number(subsidiary_code TEXT)
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Format: {SUBSIDIARY_CODE}-MISSION-{YEAR}{MONTH}-{SEQUENCE}
    -- Ex: CI-MISSION-202601-0001
    SELECT COUNT(*) + 1 INTO counter
    FROM missions
    WHERE mission_number LIKE subsidiary_code || '-MISSION-' || TO_CHAR(NOW(), 'YYYYMM') || '%';
    
    new_number := subsidiary_code || '-MISSION-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un numéro de bordereau unique
CREATE OR REPLACE FUNCTION generate_form_number(subsidiary_code TEXT)
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Format: {SUBSIDIARY_CODE}-BSD-{YEAR}{MONTH}-{SEQUENCE}
    -- Ex: CI-BSD-202601-0001
    SELECT COUNT(*) + 1 INTO counter
    FROM waste_tracking_forms
    WHERE form_number LIKE subsidiary_code || '-BSD-' || TO_CHAR(NOW(), 'YYYYMM') || '%';
    
    new_number := subsidiary_code || '-BSD-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. ROW LEVEL SECURITY (RLS) - Exemples
-- ============================================

-- Activer RLS sur les tables sensibles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_tracking_forms ENABLE ROW LEVEL SECURITY;

-- Exemple de politique : Les utilisateurs ne voient que les données de leur filiale
CREATE POLICY "Users can view their subsidiary data" ON vehicles
    FOR SELECT
    USING (
        subsidiary_id IN (
            SELECT subsidiary_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Politique pour super_admin : accès à tout
CREATE POLICY "Super admins have full access" ON vehicles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Note: Répéter ce pattern pour toutes les tables sensibles


CREATE VIEW missions_detailed AS
SELECT 
    m.*,
    v.registration_number as vehicle_registration,
    v.type as vehicle_type,
    d.driver_license_number,
    up.first_name || ' ' || up.last_name as driver_name,
    oc.company_name as origin_company,
    dc.company_name as destination_company,
    s.country_name as subsidiary_country
FROM missions m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
LEFT JOIN drivers d ON m.driver_id = d.id
LEFT JOIN user_profiles up ON d.user_id = up.id
LEFT JOIN clients oc ON m.origin_client_id = oc.id
LEFT JOIN clients dc ON m.destination_client_id = dc.id
LEFT JOIN subsidiaries s ON m.subsidiary_id = s.id;

CREATE VIEW waste_forms_with_signatures AS
SELECT 
    wtf.*,
    producer.first_name || ' ' || producer.last_name as producer_signer_name,
    transporter.first_name || ' ' || transporter.last_name as transporter_signer_name,
    destination.first_name || ' ' || destination.last_name as destination_signer_name,
    supervisor.first_name || ' ' || supervisor.last_name as supervisor_signer_name,
    m.mission_number,
    m.status as mission_status
FROM waste_tracking_forms wtf
LEFT JOIN user_profiles producer ON wtf.producer_signed_by = producer.id
LEFT JOIN user_profiles transporter ON wtf.transporter_signed_by = transporter.id
LEFT JOIN user_profiles destination ON wtf.destination_signed_by = destination.id
LEFT JOIN user_profiles supervisor ON wtf.supervisor_signed_by = supervisor.id
LEFT JOIN missions m ON wtf.mission_id = m.id;

-- Vue véhicules disponibles par filiale
CREATE VIEW available_vehicles AS
SELECT v.*, s.name AS subsidiary_name
FROM vehicles v
JOIN subsidiaries s ON v.subsidiary_id = s.id
WHERE v.status = 'available';

-- Vue chauffeurs en mission
CREATE VIEW drivers_on_mission AS
SELECT d.*, v.registration_number
FROM drivers d
LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
WHERE d.status = 'on_mission';

-- Table et trigger d’audit pour historiser les modifications
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by UUID
);

CREATE OR REPLACE FUNCTION log_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log(table_name, record_id, action, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, NEW.updated_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Contrainte sur l’année des véhicules
ALTER TABLE vehicles
ADD CONSTRAINT chk_vehicle_year CHECK (year BETWEEN 1990 AND EXTRACT(YEAR FROM NOW()));

-- Index composite pour accélérer les recherches multi-critères
CREATE INDEX idx_vehicles_subsidiary_status ON vehicles(subsidiary_id, status);

-- Foreign key avec cascade pour garantir l’intégrité
ALTER TABLE vehicles
ADD CONSTRAINT fk_subsidiary
FOREIGN KEY (subsidiary_id) REFERENCES subsidiaries(id) ON DELETE CASCADE;

-- Commentaires pour documentation
COMMENT ON TABLE waste_tracking_forms IS 'Bordereau de Suivi des Déchets (BSD) - Formulaire réglementaire digitalisé';
COMMENT ON TABLE missions IS 'Ordres de mission liant véhicules, chauffeurs et clients';
COMMENT ON TABLE subsidiaries IS 'Filiales/Pays pour architecture multi-tenant';
COMMENT ON COLUMN waste_tracking_forms.form_number IS 'Numéro unique du bordereau au format: {PAYS}-BSD-{YYYYMM}-{SEQUENCE}';

-- ============================================
-- 99. GESTION FINANCIÈRE - BTP / LOGISTIQUE
-- ============================================

CREATE TYPE IF NOT EXISTS invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE IF NOT EXISTS payroll_status AS ENUM ('pending', 'processed', 'paid', 'cancelled');
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('revenue', 'expense', 'salary', 'invoice_payment', 'tax', 'loan', 'transfer');
CREATE TYPE IF NOT EXISTS billing_unit AS ENUM ('forfait', 'ton_km', 'jour_equipe', 'heure_machine', 'm3_transport', 'km_tracte', 'unite');

CREATE TABLE IF NOT EXISTS budget_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    site_id UUID,
    annual_budget NUMERIC(18, 2) NOT NULL DEFAULT 0,
    billing_unit billing_unit NOT NULL DEFAULT 'forfait',
    unit_description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subsidiary_id, site_id)
);
CREATE INDEX idx_budget_settings_subsidiary ON budget_settings(subsidiary_id);
CREATE INDEX idx_budget_settings_site ON budget_settings(site_id);

CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    reference TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_billing_invoices_subsidiary ON billing_invoices(subsidiary_id);
CREATE INDEX idx_billing_invoices_client ON billing_invoices(client_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_invoices_issued_at ON billing_invoices(issued_at DESC);

CREATE TABLE IF NOT EXISTS payroll_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_payroll_management_subsidiary ON payroll_management(subsidiary_id);
CREATE INDEX idx_payroll_management_employee ON payroll_management(employee_id);
CREATE INDEX idx_payroll_management_period ON payroll_management(pay_period_start, pay_period_end);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID NOT NULL REFERENCES subsidiaries(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    related_invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
    related_payroll_id UUID REFERENCES payroll_management(id) ON DELETE SET NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'XOF',
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    category TEXT,
    payment_method TEXT,
    reference TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_financial_transactions_subsidiary ON financial_transactions(subsidiary_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date DESC);

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
BEGIN
    total_deductions := COALESCE((SELECT SUM((elem->>'amount')::NUMERIC) FROM jsonb_array_elements(_deductions) AS elem), 0);
    tax_withheld := ROUND(GREATEST(_gross_salary * COALESCE(_tax_rate, 0), 0), 2);
    net_salary := ROUND(GREATEST(_gross_salary - total_deductions - tax_withheld, 0), 2);
END;
$$;

CREATE OR REPLACE FUNCTION billing_invoice_totals_trigger()
RETURNS TRIGGER AS $$
DECLARE
    totals RECORD;
BEGIN
    SELECT * INTO totals FROM calculate_invoice_totals(NEW.unit_quantity, NEW.unit_price, NEW.discount_amount, NEW.tax_rate);
    NEW.subtotal_amount := totals.subtotal;
    NEW.tax_amount := totals.tax_amount;
    NEW.total_amount := totals.total;
    NEW.updated_at := NOW();
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
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payroll_net_salary ON payroll_management;
CREATE TRIGGER payroll_net_salary
BEFORE INSERT OR UPDATE ON payroll_management
FOR EACH ROW EXECUTE FUNCTION payroll_net_salary_trigger();

-- RLS policies for financial tables
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
