-- ============================================
-- Migration : Données de test pour IVOS
-- ============================================

-- 1. Créer des filiales de test
INSERT INTO subsidiaries (id, name, country_code, country_name, legal_entity, address, phone, email, timezone, currency_code) VALUES
('11111111-1111-1111-1111-111111111111', 'IVOS Sénégal', 'SEN', 'Sénégal', 'IVOS SN SARL', 'Dakar, Zone Industrielle de Hann', '+221 33 825 50 00', 'contact@ivos-sn.com', 'Africa/Dakar', 'XOF'),
('22222222-2222-2222-2222-222222222222', 'IVOS Sénégal', 'SEN', 'Sénégal', 'IVOS SN SA', 'Dakar, Route des Almadies', '+221 33 825 50 00', 'contact@ivos-sn.com', 'Africa/Dakar', 'XOF'),
('33333333-3333-3333-3333-333333333333', 'IVOS France', 'FRA', 'France', 'IVOS France SAS', 'Paris, 15 Rue de la Paix', '+33 1 42 68 53 00', 'contact@ivos-fr.com', 'Europe/Paris', 'EUR');

-- 2. Créer des utilisateurs de test
-- Note: Les utilisateurs doivent d'abord être créés via Supabase Auth
-- Ici on crée juste les profils

-- Super Admin
INSERT INTO user_profiles (id, subsidiary_id, role, status, first_name, last_name, phone, employee_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'super_admin', 'active', 'Jean', 'Dupont', '+221 77 123 45 67', 'EMP001');

-- Country Manager SN
INSERT INTO user_profiles (id, subsidiary_id, role, status, first_name, last_name, phone, employee_id) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'country_manager', 'active', 'Kouassi', 'N''Guessan', '+221 78 456 78 90', 'EMP002');

-- Dispatcher SN
INSERT INTO user_profiles (id, subsidiary_id, role, status, first_name, last_name, phone, employee_id) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'dispatcher', 'active', 'Aya', 'Koné', '+221 76 112 23 34', 'EMP003');

-- Chauffeurs SN
INSERT INTO user_profiles (id, subsidiary_id, role, status, first_name, last_name, phone, employee_id) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'driver', 'active', 'Yao', 'Kouamé', '+221 77 445 56 67', 'DRV001'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'driver', 'active', 'Abou', 'Traoré', '+221 76 889 90 01', 'DRV002');

-- 3. Créer des véhicules de test
INSERT INTO vehicles (id, subsidiary_id, registration_number, type, brand, model, year, capacity_weight_kg, capacity_volume_m3, status) VALUES
('v1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'SN-8765-AB', 'truck', 'Mercedes-Benz', 'Actros 2546', 2022, 25000, 60, 'available'),
('v2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'SN-9876-CD', 'tanker', 'Volvo', 'FH16', 2021, 30000, 25, 'available'),
('v3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'SN-5432-EF', 'compactor', 'Scania', 'R450', 2023, 18000, 40, 'maintenance');

-- 4. Créer des profils chauffeurs
INSERT INTO drivers (id, user_id, subsidiary_id, driver_license_number, license_type, license_expiry, hazmat_certified, status) VALUES
('d1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'SN-DL-001234', 'C', '2027-12-31', true, 'available'),
('d2222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'SN-DL-005678', 'CE', '2026-06-30', false, 'available');

-- 5. Créer des clients de test
INSERT INTO clients (id, subsidiary_id, company_name, client_type, contact_name, contact_phone, contact_email, address_line1, city, country) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Usine Pharmaceutique ABC', 'producer', 'Dr. Marie Kouassi', '+221 33 822 11 22', 'marie.kouassi@abc-pharma.sn', 'Zone Industrielle de Hann', 'Dakar', 'Sénégal'),
('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Centre de Traitement EcoWaste', 'receiver', 'Kouadio Désiré', '+221 76 334 45 56', 'desire.kouadio@ecowaste.sn', 'Route de Rufisque, KM 15', 'Rufisque', 'Sénégal'),
('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Raffinerie Pétrolière XYZ', 'producer', 'Jean-Paul Bakayoko', '+221 33 827 78 89', 'jp.bakayoko@xyz-oil.sn', 'Zone Portuaire', 'Dakar', 'Sénégal');

-- 6. Créer une mission de test
INSERT INTO missions (
  id, 
  subsidiary_id, 
  mission_number, 
  mission_type, 
  status, 
  vehicle_id, 
  driver_id, 
  origin_client_id, 
  destination_client_id,
  planned_start_date,
  planned_end_date,
  planned_distance_km,
  description,
  created_by
) VALUES (
  'm1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'SN-MISSION-202601-0001',
  'waste_collection',
  'validated',
  'v1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  '2026-01-15 08:00:00+00',
  '2026-01-15 16:00:00+00',
  45.5,
  'Collecte de déchets pharmaceutiques dangereux',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- 7. Créer un bordereau de test
INSERT INTO waste_tracking_forms (
  id,
  subsidiary_id,
  mission_id,
  form_number,
  form_version,
  
  -- Section A: Producteur
  producer_client_id,
  producer_name,
  producer_address,
  producer_contact_name,
  producer_contact_phone,
  producer_ninea,
  
  -- Section B: Déchet
  waste_description,
  waste_state,
  waste_category_code,
  waste_category_name,
  packaging_type,
  packaging_quantity,
  estimated_weight_kg,
  is_hazardous,
  un_number,
  danger_class,
  
  -- Section C: Transporteur
  transporter_company_name,
  transporter_license_number,
  transporter_vehicle_registration,
  transporter_driver_name,
  
  -- Section D: Destination
  destination_client_id,
  destination_facility_name,
  destination_facility_address,
  destination_facility_license,
  acceptance_status,
  
  status,
  created_by
) VALUES (
  'w1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'm1111111-1111-1111-1111-111111111111',
  'SN-BSD-202601-0001',
  1,
  
  'c1111111-1111-1111-1111-111111111111',
  'Usine Pharmaceutique ABC',
  'Zone Industrielle de Hann, Dakar, Sénégal',
  'Dr. Marie Kouassi',
  '+221 33 822 11 22',
  'SN-ABC-2023-12345',
  
  'Déchets pharmaceutiques périmés : antibiotiques, antiseptiques, et résidus de laboratoire. Produits classés dangereux selon la réglementation nationale.',
  'solid',
  '18 01 09',
  'Médicaments autres que ceux visés à la rubrique 18 01 08',
  'drum',
  12,
  450.00,
  true,
  'UN3291',
  'Classe 6.1',
  
  'IVOS Sénégal',
  'TRANS-SN-2023-001',
  'SN-8765-AB',
  'Yao Kouamé',
  
  'c2222222-2222-2222-2222-222222222222',
  'Centre de Traitement EcoWaste',
  'Route de Rufisque, KM 15, Rufisque, Sénégal',
  'DEST-SN-2023-005',
  'pending',
  
  'validated',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- 8. Créer quelques notifications de test
INSERT INTO notifications (subsidiary_id, user_id, type, title, message, entity_type, entity_id) VALUES
('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'mission_assigned', 'Nouvelle mission assignée', 'Vous avez été assigné à la mission SN-MISSION-202601-0001', 'mission', 'm1111111-1111-1111-1111-111111111111'),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'waste_form_signed', 'Bordereau signé', 'Le bordereau SN-BSD-202601-0001 a été signé par le producteur', 'waste_tracking_form', 'w1111111-1111-1111-1111-111111111111');

-- Afficher un résumé
SELECT 
  'Données de test créées avec succès!' as message,
  (SELECT COUNT(*) FROM subsidiaries) as nb_filiales,
  (SELECT COUNT(*) FROM user_profiles) as nb_utilisateurs,
  (SELECT COUNT(*) FROM vehicles) as nb_vehicules,
  (SELECT COUNT(*) FROM drivers) as nb_chauffeurs,
  (SELECT COUNT(*) FROM clients) as nb_clients,
  (SELECT COUNT(*) FROM missions) as nb_missions,
  (SELECT COUNT(*) FROM waste_tracking_forms) as nb_bordereaux;
