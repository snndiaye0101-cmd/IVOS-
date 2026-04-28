# 📚 Documentation IVOS Fleet Management

Bienvenue dans la documentation complète du projet IVOS.

## 📖 Documents Disponibles

### 🎯 Guide Principal
- **[README.md](../README.md)** - Vue d'ensemble du projet
- **[NEXT_STEPS.md](../NEXT_STEPS.md)** - Guide de démarrage détaillé avec checklist complète

### 🏗️ Architecture
- **[PROJECT_STRUCTURE.txt](../PROJECT_STRUCTURE.txt)** - Structure complète des dossiers
- **[ARCHITECTURE.html](ARCHITECTURE.html)** - Documentation visuelle interactive (ouvrir dans un navigateur)
- **[DATABASE_RELATIONS.md](DATABASE_RELATIONS.md)** - Diagramme des relations de la base de données

### 🗄️ Base de Données
- **[schema.sql](../database/schema.sql)** - Schéma SQL complet (14 tables)
- **[sample_data.sql](../database/seed/sample_data.sql)** - Données de test

### ⚙️ Configuration
- **[.env.example](../.env.example)** - Variables d'environnement
- **[package.json](../package.json)** - Dépendances du projet
- **[vite.config.ts](../vite.config.ts)** - Configuration Vite
- **[tailwind.config.js](../tailwind.config.js)** - Configuration Tailwind CSS
- **[tsconfig.json](../tsconfig.json)** - Configuration TypeScript

---

## 🚀 Démarrage Rapide

### 1. Installation
```bash
# Cloner le projet (ou créer depuis zéro)
npm install

# Installer Supabase CLI
npm install -g supabase
```

### 2. Configuration Base de Données
```bash
# Démarrer Supabase local
supabase start

# Appliquer le schéma
supabase db push --local

# Insérer les données de test
psql -h localhost -p 54322 -U postgres -d postgres < database/seed/sample_data.sql

# Générer les types TypeScript
npm run supabase:types
```

### 3. Configuration Application
```bash
# Copier les variables d'environnement
cp .env.example .env.local

# Éditer .env.local avec vos credentials Supabase
```

### 4. Lancer l'Application
```bash
npm run dev
# Ouvre http://localhost:3000
```

---

## 📊 Architecture du Système

### Stack Technique
```
┌─────────────────────────────────────────┐
│           FRONTEND (PWA)                │
│  ─────────────────────────────────────  │
│  React 18 + TypeScript + Vite           │
│  Tailwind CSS + Shadcn/UI               │
│  React Router 6 + React Query           │
└──────────────┬──────────────────────────┘
               │ REST API / Realtime
               ▼
┌─────────────────────────────────────────┐
│             SUPABASE                    │
│  ─────────────────────────────────────  │
│  PostgreSQL (14 tables)                 │
│  Row Level Security (RLS)               │
│  Authentication (JWT)                   │
│  Storage (Files/Signatures)             │
│  Edge Functions                         │
└──────────────┬──────────────────────────┘
               │ Webhooks
               ▼
┌─────────────────────────────────────────┐
│              N8N                        │
│  ─────────────────────────────────────  │
│  PDF Generation                         │
│  Email Notifications                    │
│  Automated Reports                      │
└─────────────────────────────────────────┘
```

### Modules Fonctionnels

```
📁 features/
├── 🔐 auth/              Authentification & autorisation
├── 🚛 fleet/             Gestion véhicules & chauffeurs
├── 📋 missions/          Ordres de mission & workflow
├── ♻️ waste-tracking/    Bordereaux BSD (PRIORITÉ)
├── 👥 clients/           Gestion clients/partenaires
├── 📊 reporting/         Dashboards & analytics
└── ⚙️ settings/          Paramètres & configuration
```

---

## 🎯 Fonctionnalités Principales

### 1. Multi-Tenant
- Architecture multi-pays/filiales
- Isolation complète des données (RLS)
- Configuration par filiale (devise, timezone, etc.)

### 2. Gestion de Flotte
- **Véhicules :** CRUD, maintenance, documents, statuts
- **Chauffeurs :** Permis, certifications HAZMAT, disponibilité

### 3. Workflow Missions
```
Brouillon → Validé → En Cours → Terminé → Clôturé
                                   ↓
                              Annulé
```

### 4. Bordereau de Suivi des Déchets (BSD) 🌟

#### Section A : Producteur/Client
- Nom, adresse, contact, SIRET
- Coordonnées GPS optionnelles

#### Section B : Caractérisation du Déchet
- État : Gazeux / Liquide / Solide / Boues / Mixte
- Conditionnement : Benne / Citerne / Fût / Sac / Vrac / Conteneur
- Quantité estimée (kg, m³)
- Dangerosité (Numéro ONU, classe de danger)

#### Section C : Collecteur/Transporteur
- Compagnie, licence, véhicule, chauffeur
- Date de prise en charge
- **Signature numérique**

#### Section D : Installation de Destination
- Réception, pesée réelle
- Acceptation : OUI / NON / PARTIEL
- Motif de refus si applicable
- **Signature numérique**

#### Signatures Numériques Multi-Parties
- ✍️ Producteur
- ✍️ Transporteur
- ✍️ Destination
- ✍️ Superviseur (validation finale)

Chaque signature capture :
- Horodatage
- Utilisateur
- Adresse IP
- Coordonnées GPS
- Appareil utilisé

---

## 🔐 Sécurité & Rôles

### Rôles RBAC

| Rôle              | Accès                                      |
|-------------------|--------------------------------------------|
| **Super Admin**   | Global (toutes filiales)                   |
| **Country Manager** | Sa filiale uniquement                    |
| **Dispatcher**    | Créer/modifier missions de sa filiale      |
| **Driver**        | Voir ses missions, signer bordereaux       |
| **Client**        | Voir missions le concernant                |
| **Supervisor**    | Valider bordereaux, accès lecture étendu   |

### Mesures de Sécurité
- ✅ Row Level Security (RLS) sur toutes les tables
- ✅ Authentification JWT (Supabase Auth)
- ✅ Audit trail complet (audit_logs)
- ✅ Chiffrement des données sensibles
- ✅ HTTPS obligatoire en production
- ✅ Politique CORS stricte

---

## 📱 Progressive Web App (PWA)

### Fonctionnalités PWA
- ✅ Installation sur mobile (iOS/Android)
- ✅ Mode offline avec synchronisation
- ✅ Notifications push
- ✅ Signature tactile
- ✅ Géolocalisation
- ✅ Cache intelligent (Service Worker)

### Configuration
Voir [vite.config.ts](../vite.config.ts) pour la configuration PWA complète.

---

## 🔗 Intégrations

### Webhooks n8n

#### 1. Génération PDF
```
POST /webhook/generate-pdf
{
  "formId": "uuid",
  "formNumber": "CI-BSD-202601-0001",
  "data": { ... }
}
```

#### 2. Notifications
```
POST /webhook/send-notification
{
  "userId": "uuid",
  "type": "mission_assigned",
  "message": "..."
}
```

#### 3. Rapports Automatisés
- Rapports hebdomadaires
- Alertes maintenance
- Exports Excel programmés

---

## 🧪 Tests & Qualité

### Scripts NPM
```bash
npm run dev         # Développement
npm run build       # Build production
npm run preview     # Preview du build
npm run lint        # Linter ESLint
npm run format      # Prettier
npm run type-check  # Vérification TypeScript
```

### Données de Test
```bash
# Charger les données de test
psql -h localhost -p 54322 -U postgres -d postgres < database/seed/sample_data.sql
```

Données créées :
- 3 filiales (CI, SN, FR)
- 5 utilisateurs (admin, manager, dispatcher, 2 chauffeurs)
- 3 véhicules
- 3 clients
- 1 mission de test
- 1 bordereau de test

---

## 📖 Guides Spécifiques

### Pour les Développeurs Frontend
1. Lire [PROJECT_STRUCTURE.txt](../PROJECT_STRUCTURE.txt)
2. Consulter les types dans `src/shared/types/`
3. Utiliser les hooks personnalisés dans `src/shared/hooks/`
4. Suivre les patterns dans `src/features/waste-tracking/`

### Pour les Développeurs Backend
1. Étudier [schema.sql](../database/schema.sql)
2. Comprendre les politiques RLS
3. Consulter [DATABASE_RELATIONS.md](DATABASE_RELATIONS.md)
4. Créer les Edge Functions dans `supabase/functions/`

### Pour les DevOps
1. Configuration Supabase dans `supabase/config.toml`
2. Variables d'environnement dans `.env.example`
3. Build configuration dans `vite.config.ts`
4. Déploiement sur Vercel/Netlify avec Supabase remote

---

## 🐛 Débogage

### Problèmes Courants

#### 1. Erreur de connexion Supabase
```bash
# Vérifier le statut
supabase status

# Redémarrer si nécessaire
supabase stop && supabase start
```

#### 2. Types TypeScript obsolètes
```bash
# Régénérer
npm run supabase:types
```

#### 3. Erreurs de build
```bash
# Nettoyer le cache
rm -rf node_modules/.vite
npm run dev
```

#### 4. Problèmes RLS
```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'waste_tracking_forms';

-- Tester en tant qu'utilisateur
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'user-uuid';
```

---

## 📚 Ressources Externes

### Documentation Officielle
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

### Tutoriels Recommandés
- [Supabase + React Tutorial](https://supabase.com/docs/guides/with-react)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Shadcn/UI Installation](https://ui.shadcn.com/docs/installation/vite)

---

## 📞 Support

### Structure de Support

```
Question sur...          → Consulter...
─────────────────────────────────────────────
Architecture générale    → README.md
Démarrage projet         → NEXT_STEPS.md
Base de données          → DATABASE_RELATIONS.md
Structure fichiers       → PROJECT_STRUCTURE.txt
Configuration            → Fichiers .env, vite.config, etc.
```

---

## 🗺️ Roadmap

### Phase 1 (Semaines 1-2) ✅
- [x] Architecture base de données
- [x] Structure projet React
- [x] Configuration Vite + Tailwind
- [ ] Authentification
- [ ] Layout principal

### Phase 2 (Semaines 3-4) 🚧
- [ ] Gestion véhicules
- [ ] Gestion chauffeurs
- [ ] Dashboard KPIs
- [ ] CRUD Missions

### Phase 3 (Semaines 5-6) 🎯 PRIORITÉ
- [ ] Bordereau BSD - Wizard 4 sections
- [ ] Signatures numériques
- [ ] Génération PDF (n8n)
- [ ] Liste et détails bordereaux

### Phase 4 (Semaines 7-8)
- [ ] Gestion clients
- [ ] Reporting avancé
- [ ] Exports Excel/CSV
- [ ] PWA Mode offline

### Phase 5 (Semaines 9-10)
- [ ] Notifications push
- [ ] Géolocalisation temps réel
- [ ] Mobile app (Capacitor optionnel)
- [ ] Tests E2E

---

## 📄 Licence

Propriétaire - IVOS © 2026  
Tous droits réservés.

---

**Bon développement ! 🚀**
