# IVOS - Fleet & Workflow Management System

Application SaaS B2B multi-tenant de gestion de flotte et de digitalisation des formulaires réglementaires (Bordereaux de Suivi des Déchets).

## 🏗️ Architecture Technique

### Stack
- **Frontend:** React 18 + Vite + TypeScript
- **UI:** Tailwind CSS + Shadcn/UI
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Orchestration:** Webhooks vers n8n (PDF, notifications)
- **Type:** Progressive Web App (PWA)

### Structure du Projet

```
IVOS/
├── database/
│   ├── schema.sql              # Schéma complet de la base de données
│   ├── migrations/             # Migrations Supabase
│   ├── seed/                   # Données de test
│   └── policies/               # Row Level Security policies
│
├── src/
│   ├── app/                    # Configuration et providers
│   │   ├── App.tsx
│   │   ├── router.tsx          # React Router configuration
│   │   └── providers/
│   │
│   ├── features/               # Fonctionnalités par domaine
│   │   ├── auth/
│   │   ├── fleet/              # Gestion de flotte
│   │   ├── missions/           # Ordres de mission
│   │   ├── waste-tracking/     # Bordereaux BSD
│   │   ├── clients/
│   │   ├── reporting/
│   │   └── settings/
│   │
│   ├── shared/                 # Code partagé
│   │   ├── components/         # Composants UI réutilisables
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utilitaires
│   │   ├── types/              # Types TypeScript globaux
│   │   ├── constants/
│   │   └── services/           # Services (API, Supabase)
│   │
│   ├── layouts/                # Layouts de page
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── MobileLayout.tsx
│   │
│   ├── assets/                 # Ressources statiques
│   └── styles/                 # Styles globaux
│
├── public/                     # Fichiers publics + PWA
│   ├── manifest.json
│   └── sw.js
│
└── supabase/                   # Configuration Supabase
    ├── functions/              # Edge Functions
    └── config.toml
```

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Configuration Supabase
# Copier .env.example vers .env et remplir les variables

# Lancer la base de données (via Supabase CLI)
supabase start
supabase db push

# Lancer l'application
npm run dev
```

## 📋 Fonctionnalités Principales

### 1. Multi-Tenant & RBAC
- Architecture multi-pays/filiales
- 6 rôles: Super Admin, Country Manager, Dispatcher, Driver, Client, Supervisor
- Row Level Security (RLS) pour isolation des données

### 2. Gestion de Flotte
- CRUD véhicules (immatriculation, maintenance, documents)
- CRUD chauffeurs (permis, certifications, disponibilité)
- Suivi temps réel des statuts

### 3. Ordres de Mission
- Workflow: Brouillon → Validé → En cours → Terminé → Clôturé
- Association: Véhicule + Chauffeur + Route + Client
- Suivi kilométrique et temps

### 4. Bordereau de Suivi des Déchets (BSD)
- Digitalisation complète du formulaire papier
- 4 sections: Producteur, Déchet, Transporteur, Destination
- Signatures numériques multi-parties
- Export PDF via webhook n8n

### 5. Reporting & Dashboards
- KPIs: Missions, KM, Tonnage
- Graphiques et exports
- Notifications en temps réel

## 🔐 Sécurité

- Authentification Supabase (JWT)
- Row Level Security (RLS)
- Politique CORS stricte
- Chiffrement des données sensibles
- Audit trail complet

## 📱 PWA

- Installation sur mobile
- Mode offline (sync)
- Notifications push
- Capture signature tactile
- Géolocalisation

## 🔗 Webhooks n8n

Endpoints disponibles:
- `/webhooks/pdf-generation` - Génération PDF bordereau
- `/webhooks/notifications` - Envoi notifications
- `/webhooks/reporting` - Rapports automatisés

## 📄 Licence

Propriétaire - IVOS © 2026
