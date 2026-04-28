# 🗄️ Diagramme des Relations - Base de Données IVOS

## Architecture Multi-Tenant

```
┌─────────────────────┐
│   SUBSIDIARIES      │  (Filiales/Pays)
│  ─────────────────  │
│  • id (PK)          │
│  • country_code     │
│  • country_name     │
│  • legal_entity     │
└──────────┬──────────┘
           │ 1
           │
           │ N
    ┌──────┴───────┬──────────┬──────────┬──────────┬──────────┐
    │              │          │          │          │          │
    ▼              ▼          ▼          ▼          ▼          ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  USERS  │  │VEHICLES │  │ DRIVERS │  │ CLIENTS │  │MISSIONS │  │  WASTE  │
│ PROFILES│  │         │  │         │  │         │  │         │  │  FORMS  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

---

## Relations Détaillées

### 1. SUBSIDIARIES (Filiales) - Racine Multi-Tenant

```
SUBSIDIARIES (1) ─────► (N) USER_PROFILES
                 │
                 ├─────► (N) VEHICLES
                 │
                 ├─────► (N) DRIVERS
                 │
                 ├─────► (N) CLIENTS
                 │
                 ├─────► (N) MISSIONS
                 │
                 └─────► (N) WASTE_TRACKING_FORMS
```

**Clé :** Toutes les données sont isolées par `subsidiary_id` (Row Level Security)

---

### 2. USER_PROFILES (Utilisateurs)

```
AUTH.USERS (Supabase Auth) (1) ─────► (1) USER_PROFILES
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
                        ▼                     ▼                     ▼
                    DRIVERS               MISSIONS            WASTE_FORMS
                  (user_id)           (created_by)         (created_by)
                                      (validated_by)     (signed_by...)
```

**Rôles :** super_admin, country_manager, dispatcher, driver, client, supervisor

---

### 3. FLOTTE - Relations Véhicules & Chauffeurs

```
┌──────────────────┐          ┌──────────────────┐
│    VEHICLES      │          │     DRIVERS      │
│  ──────────────  │          │  ──────────────  │
│  • id            │          │  • id            │
│  • subsidiary_id │          │  • user_id (FK)  │
│  • registration  │          │  • subsidiary_id │
│  • type          │          │  • license_#     │
│  • status        │          │  • status        │
└────────┬─────────┘          └─────────┬────────┘
         │                              │
         │                              │
         │         ┌────────────────────┘
         │         │
         │         │
         │         ▼
         │    ┌──────────────────┐
         └───►│    MISSIONS      │
              │  ──────────────  │
              │  • vehicle_id    │
              │  • driver_id     │
              │  • origin_client │
              │  • dest_client   │
              └────────┬─────────┘
                       │
                       │ 1
                       │
                       │ 1
                       ▼
              ┌──────────────────┐
              │ WASTE_TRACKING_  │
              │     FORMS        │
              │  ──────────────  │
              │  • mission_id    │
              └──────────────────┘
```

---

### 4. MISSIONS - Workflow Complet

```
           ┌──────────────────────┐
           │      MISSIONS        │
           │  ──────────────────  │
           │  • id                │
           │  • mission_number    │
           │  • status (workflow) │
           └──────┬───────────────┘
                  │
    ┌─────────────┼─────────────┬──────────────┐
    │             │             │              │
    ▼             ▼             ▼              ▼
VEHICLES      DRIVERS       CLIENTS      WASTE_FORMS
(vehicle_id)  (driver_id)   (origin)     (mission_id)
                            (destination)
```

**Workflow Statuts :**
```
draft → validated → in_progress → completed → closed
                                     ↓
                                 cancelled
```

---

### 5. BORDEREAU DE SUIVI DES DÉCHETS (BSD) - Entité Centrale

```
┌─────────────────────────────────────────────────────────────┐
│                  WASTE_TRACKING_FORMS                       │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  SECTION A: PRODUCTEUR                                      │
│  • producer_client_id (FK → CLIENTS)                        │
│  • producer_name, address, contact...                       │
│                                                              │
│  SECTION B: DÉCHET                                          │
│  • waste_description, waste_state, waste_category           │
│  • packaging_type, packaging_quantity                       │
│  • estimated_weight_kg, is_hazardous, un_number             │
│                                                              │
│  SECTION C: TRANSPORTEUR                                    │
│  • transporter_company, vehicle_registration                │
│  • collection_date, transporter_signature_url               │
│  • transporter_signed_by (FK → USER_PROFILES)               │
│                                                              │
│  SECTION D: DESTINATION                                     │
│  • destination_client_id (FK → CLIENTS)                     │
│  • reception_date, actual_weight_kg                         │
│  • acceptance_status (pending/accepted/rejected)            │
│  • destination_signature_url                                │
│  • destination_signed_by (FK → USER_PROFILES)               │
│                                                              │
│  SIGNATURES & VALIDATION                                    │
│  • producer_signature_url, producer_signed_by               │
│  • supervisor_signature_url, supervisor_signed_by           │
│                                                              │
│  PDF & WEBHOOKS                                             │
│  • pdf_url, pdf_generated_at                                │
│  • pdf_webhook_triggered                                    │
└─────────────────────────────────────────────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌─────────────────────┐
│  SIGNATURE_LOGS     │  (Historique immutable)
│  ─────────────────  │
│  • waste_form_id    │
│  • signature_type   │
│  • signed_by        │
│  • signature_url    │
│  • gps_location     │
│  • ip_address       │
└─────────────────────┘
```

---

### 6. CLIENTS - Relations Bidirectionnelles

```
┌──────────────────┐
│     CLIENTS      │
│  ──────────────  │
│  • id            │
│  • client_type   │  (producer/receiver/both)
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
MISSIONS  WASTE_FORMS
(origin)  (producer)
(destination) (destination)
```

---

### 7. DOCUMENTS - Relation Polymorphique

```
┌──────────────────┐
│    DOCUMENTS     │
│  ──────────────  │
│  • entity_type   │  ('vehicle', 'driver', 'mission', 'waste_form', 'client')
│  • entity_id     │  (UUID de l'entité parente)
│  • category      │
│  • file_path     │
└──────────────────┘
         │
         └──► VEHICLES
         └──► DRIVERS
         └──► MISSIONS
         └──► WASTE_FORMS
         └──► CLIENTS
```

---

### 8. NOTIFICATIONS & WEBHOOKS

```
┌──────────────────┐          ┌──────────────────┐
│  NOTIFICATIONS   │          │  WEBHOOK_LOGS    │
│  ──────────────  │          │  ──────────────  │
│  • user_id (FK)  │          │  • event_type    │
│  • type          │          │  • entity_type   │
│  • entity_id     │          │  • entity_id     │
│  • is_read       │          │  • payload       │
└──────────────────┘          │  • success       │
                              └──────────────────┘
```

---

### 9. AUDIT_LOGS - Traçabilité Complète

```
┌──────────────────┐
│   AUDIT_LOGS     │
│  ──────────────  │
│  • user_id (FK)  │
│  • action        │  ('CREATE', 'UPDATE', 'DELETE', 'SIGN')
│  • entity_type   │
│  • entity_id     │
│  • old_data      │  (JSONB)
│  • new_data      │  (JSONB)
│  • changes       │  (JSONB diff)
└──────────────────┘
```

---

## Cardinalités Principales

| Relation                           | Cardinalité |
|------------------------------------|-------------|
| SUBSIDIARIES → USER_PROFILES       | 1 → N       |
| SUBSIDIARIES → VEHICLES            | 1 → N       |
| SUBSIDIARIES → DRIVERS             | 1 → N       |
| SUBSIDIARIES → MISSIONS            | 1 → N       |
| VEHICLES → MISSIONS                | 1 → N       |
| DRIVERS → MISSIONS                 | 1 → N       |
| MISSIONS → WASTE_FORMS             | 1 → 1       |
| CLIENTS → MISSIONS (origin)        | 1 → N       |
| CLIENTS → MISSIONS (destination)   | 1 → N       |
| CLIENTS → WASTE_FORMS (producer)   | 1 → N       |
| CLIENTS → WASTE_FORMS (destination)| 1 → N       |
| USER_PROFILES → SIGNATURES         | 1 → N       |
| WASTE_FORMS → SIGNATURE_LOGS       | 1 → N       |

---

## Flux de Données - Cas d'Usage BSD

### Scénario : Création et Signature d'un Bordereau

```
1. MISSION créée
   ├─ Assign VEHICLE
   ├─ Assign DRIVER
   ├─ Define ORIGIN CLIENT
   └─ Define DESTINATION CLIENT

2. WASTE_FORM créée
   ├─ Link to MISSION
   ├─ Section A: PRODUCER data
   ├─ Section B: WASTE characterization
   ├─ Section C: TRANSPORTER info
   └─ Section D: DESTINATION details

3. SIGNATURE WORKFLOW
   ├─ Producer signs → SIGNATURE_LOG created
   ├─ Transporter signs → collection_confirmed_at
   ├─ Destination signs → acceptance_status updated
   └─ Supervisor validates → final approval

4. PDF GENERATION
   ├─ Trigger WEBHOOK to n8n
   ├─ Generate PDF from template
   ├─ Upload to Supabase Storage
   ├─ Update pdf_url in WASTE_FORM
   └─ Log in WEBHOOK_LOGS

5. NOTIFICATIONS
   └─ Send to relevant USER_PROFILES
```

---

## Index & Optimisations

### Index Critiques

```sql
-- Multi-tenant isolation
CREATE INDEX idx_vehicles_subsidiary ON vehicles(subsidiary_id);
CREATE INDEX idx_missions_subsidiary ON missions(subsidiary_id);
CREATE INDEX idx_wtf_subsidiary ON waste_tracking_forms(subsidiary_id);

-- Recherche par statut
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- Recherche par date
CREATE INDEX idx_missions_dates ON missions(planned_start_date, planned_end_date);
CREATE INDEX idx_wtf_collection_date ON waste_tracking_forms(collection_date);

-- Relations fréquentes
CREATE INDEX idx_wtf_mission ON waste_tracking_forms(mission_id);
CREATE INDEX idx_drivers_user ON drivers(user_id);
```

---

## Row Level Security (RLS)

### Politique d'Accès

```
┌────────────────────────────────────────────────┐
│  SUPER_ADMIN                                   │
│  └─► Accès GLOBAL (toutes subsidiaries)       │
├────────────────────────────────────────────────┤
│  COUNTRY_MANAGER                               │
│  └─► Accès à SA subsidiary uniquement          │
├────────────────────────────────────────────────┤
│  DISPATCHER                                    │
│  └─► READ/WRITE missions de sa subsidiary      │
├────────────────────────────────────────────────┤
│  DRIVER                                        │
│  └─► READ ses missions uniquement              │
│  └─► WRITE waste_forms de ses missions         │
├────────────────────────────────────────────────┤
│  CLIENT                                        │
│  └─► READ missions où il est origin/dest       │
│  └─► SIGN waste_forms le concernant            │
└────────────────────────────────────────────────┘
```

---

## Vues Matérialisées (Optionnel)

### Pour Performance

```sql
-- Vue des missions avec détails complets
CREATE VIEW missions_detailed AS ...

-- Vue des bordereaux avec toutes les signatures
CREATE VIEW waste_forms_with_signatures AS ...

-- Vue des statistiques par filiale
CREATE MATERIALIZED VIEW subsidiary_stats AS ...
```

---

## Conclusion

Cette architecture garantit :
- ✅ **Isolation multi-tenant** stricte
- ✅ **Traçabilité complète** (audit logs)
- ✅ **Workflow BSD** conforme réglementaire
- ✅ **Scalabilité** horizontale par filiale
- ✅ **Sécurité** (RLS + Auth JWT)
- ✅ **Performance** (indexes optimisés)
