# ⚡ IVOS - Référence Rapide

Guide de référence ultra-rapide pour les développeurs.

---

## 🚀 Commandes Essentielles

### Développement
```bash
npm run dev                 # Lancer en mode dev (port 3000)
npm run build               # Build production
npm run preview             # Preview du build
```

### Supabase
```bash
supabase start              # Démarrer Supabase local
supabase stop               # Arrêter
supabase db reset           # Reset + seed
supabase db push            # Push migrations
npm run supabase:types      # Générer types TS
```

### Shadcn/UI
```bash
npx shadcn-ui@latest init                    # Initialiser
npx shadcn-ui@latest add button              # Ajouter composant
npx shadcn-ui@latest add dialog form table   # Multiples
```

---

## 📁 Structure Projet (Simplifié)

```
src/
├── app/              # Config globale (App, router, providers)
├── features/         # Modules métier
│   ├── auth/
│   ├── fleet/        # Véhicules + Chauffeurs
│   ├── missions/
│   ├── waste-tracking/  # 🎯 BSD
│   ├── clients/
│   ├── reporting/
│   └── settings/
├── shared/           # Code partagé
│   ├── components/   # UI réutilisables
│   ├── hooks/        # Custom hooks
│   ├── utils/        # Utilitaires
│   ├── types/        # Types TS
│   └── services/     # API services
└── layouts/          # Layouts de page
```

---

## 🗄️ Tables Principales

| Table                  | Description                    |
|------------------------|--------------------------------|
| `subsidiaries`         | Filiales/Pays (multi-tenant)   |
| `user_profiles`        | Utilisateurs (6 rôles)         |
| `vehicles`             | Véhicules                      |
| `drivers`              | Chauffeurs                     |
| `clients`              | Clients/Partenaires            |
| `missions`             | Ordres de mission              |
| `waste_tracking_forms` | 🎯 Bordereaux BSD             |
| `signature_logs`       | Historique signatures          |
| `documents`            | Fichiers/Photos                |
| `notifications`        | Notifications utilisateurs     |
| `webhook_logs`         | Logs webhooks n8n              |
| `audit_logs`           | Audit trail                    |

---

## 🔑 Rôles & Permissions

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',      // Accès global
  COUNTRY_MANAGER = 'country_manager', // Manager filiale
  DISPATCHER = 'dispatcher',         // Créer missions
  DRIVER = 'driver',                 // Exécuter missions
  CLIENT = 'client',                 // Voir ses missions
  SUPERVISOR = 'supervisor'          // Valider bordereaux
}
```

---

## 📋 Bordereau BSD - Sections

### Section A: Producteur
```typescript
{
  producer_name: string
  producer_address: string
  producer_contact_name: string
  producer_siret: string
  // ...
}
```

### Section B: Déchet
```typescript
{
  waste_description: string
  waste_state: 'gaseous' | 'liquid' | 'solid' | 'sludge' | 'mixed'
  packaging_type: 'skip' | 'tanker' | 'drum' | 'bag' | 'bulk' | 'container'
  packaging_quantity: number
  estimated_weight_kg: number
  is_hazardous: boolean
  un_number?: string  // Si dangereux
  // ...
}
```

### Section C: Transporteur
```typescript
{
  transporter_company_name: string
  transporter_vehicle_registration: string
  transporter_driver_name: string
  collection_date: Date
  transporter_signature_url?: string
  transporter_signed_by?: UUID
  // ...
}
```

### Section D: Destination
```typescript
{
  destination_facility_name: string
  destination_facility_address: string
  reception_date: Date
  actual_weight_kg: number
  acceptance_status: 'pending' | 'accepted' | 'rejected' | 'partial'
  rejection_reason?: string
  destination_signature_url?: string
  // ...
}
```

---

## 🎨 Composants Shadcn/UI à Installer

### Priorité 1 (Setup initial)
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
```

### Priorité 2 (Formulaires)
```bash
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add date-picker
```

### Priorité 3 (UI avancée)
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

---

## 🔗 Imports Utiles

### Client Supabase
```typescript
import { supabase } from '@shared/services/supabaseClient'

// Récupérer des données
const { data, error } = await supabase
  .from('vehicles')
  .select('*')
  .eq('subsidiary_id', subsidiaryId)
```

### Types
```typescript
import type { WasteTrackingForm } from '@features/waste-tracking/types/wasteForm.types'
import { UserRole, MissionStatus } from '@shared/types/enums'
```

### Utilitaires
```typescript
import { cn } from '@shared/utils/cn'
import { formatDate, formatWeight } from '@shared/utils/formatters'
```

### Composants UI
```typescript
import { Button } from '@shared/components/ui/button'
import { Card } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
```

---

## 🔍 Requêtes Supabase Fréquentes

### Récupérer avec relations
```typescript
const { data } = await supabase
  .from('missions')
  .select(`
    *,
    vehicle:vehicles(*),
    driver:drivers(*),
    origin:clients!origin_client_id(*)
  `)
  .eq('status', 'in_progress')
```

### Insert avec retour
```typescript
const { data, error } = await supabase
  .from('waste_tracking_forms')
  .insert({ ... })
  .select()
  .single()
```

### Update
```typescript
const { error } = await supabase
  .from('vehicles')
  .update({ status: 'maintenance' })
  .eq('id', vehicleId)
```

### Filtres multiples
```typescript
const { data } = await supabase
  .from('waste_tracking_forms')
  .select('*')
  .eq('subsidiary_id', subsidiaryId)
  .eq('status', 'validated')
  .gte('collection_date', '2026-01-01')
  .order('created_at', { ascending: false })
  .limit(50)
```

---

## 🎯 Workflow Mission

```typescript
// États possibles
type MissionStatus = 
  | 'draft'
  | 'validated'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled'

// Transitions autorisées
const transitions = {
  draft: ['validated', 'cancelled'],
  validated: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['closed'],
  closed: [],
  cancelled: []
}
```

---

## ✍️ Signatures Numériques

### Capture signature
```typescript
import SignaturePad from 'signature_pad'

const canvas = useRef<HTMLCanvasElement>(null)
const signaturePad = new SignaturePad(canvas.current!)

// Sauvegarder
const dataUrl = signaturePad.toDataURL('image/png')

// Envoyer au service
await saveSignature(formId, {
  formId,
  signatureType: 'producer',
  signedBy: userId,
  ipAddress: '...',
  gpsLocation: { latitude, longitude }
}, dataUrl)
```

---

## 🌐 Variables d'Environnement

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# n8n Webhooks
VITE_N8N_WEBHOOK_BASE_URL=https://n8n.xxx.com
VITE_N8N_PDF_GENERATION_WEBHOOK=/webhook/generate-pdf

# App
VITE_APP_NAME=IVOS Fleet Management
VITE_APP_ENV=development
```

---

## 🐛 Débogage Rapide

### Logs Supabase
```typescript
// Activer les logs
const { data, error } = await supabase
  .from('table')
  .select('*')

console.log('Data:', data)
console.log('Error:', error)
```

### RLS Issues
```sql
-- Désactiver temporairement (DEV ONLY!)
ALTER TABLE waste_tracking_forms DISABLE ROW LEVEL SECURITY;

-- Réactiver
ALTER TABLE waste_tracking_forms ENABLE ROW LEVEL SECURITY;
```

### Vérifier utilisateur courant
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)
```

---

## 📊 Dashboard KPIs

### Métriques clés
```typescript
interface DashboardStats {
  totalMissions: number
  activeMissions: number
  completedMissions: number
  totalKilometers: number
  totalWasteWeight: number  // kg
  availableVehicles: number
  activeDrivers: number
  pendingWasteForms: number
}
```

---

## 🔒 Sécurité - Checklist

- [ ] RLS activé sur toutes les tables
- [ ] Politiques RLS testées
- [ ] Variables sensibles dans .env.local (pas dans git)
- [ ] HTTPS en production
- [ ] JWT tokens avec expiration
- [ ] Validation inputs (Zod)
- [ ] Rate limiting (Supabase)
- [ ] Audit logs activés

---

## 📱 PWA - Manifest

```json
{
  "name": "IVOS Fleet Management",
  "short_name": "IVOS",
  "theme_color": "#0f172a",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [...]
}
```

---

## 🔗 Liens Rapides

- [Supabase Dashboard](https://app.supabase.com/)
- [Shadcn/UI Components](https://ui.shadcn.com/docs/components)
- [Tailwind Classes](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

---

## 📞 Aide Rapide

| Besoin                     | Fichier à consulter               |
|----------------------------|-----------------------------------|
| Vue d'ensemble             | [README.md](../README.md)         |
| Démarrage                  | [NEXT_STEPS.md](../NEXT_STEPS.md) |
| Structure                  | [PROJECT_STRUCTURE.txt](../PROJECT_STRUCTURE.txt) |
| Base de données            | [schema.sql](../database/schema.sql) |
| Relations DB               | [DATABASE_RELATIONS.md](DATABASE_RELATIONS.md) |
| Architecture visuelle      | [ARCHITECTURE.html](ARCHITECTURE.html) |

---

**🚀 Happy Coding!**
